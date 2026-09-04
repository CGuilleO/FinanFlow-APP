import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy GoogleGenAI initializer
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 1. OCR Ticket / Receipt Scanner
app.post("/api/gemini/ocr", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", availableCategories = [] } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const ai = getAIClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

    const prompt = `Analiza este ticket, factura o recibo de compra. Extrae la información con máxima precisión.
Categorías disponibles del usuario: ${JSON.stringify(availableCategories)}

Devuelve los datos en formato JSON con la siguiente estructura:
- merchant: Nombre del comercio o tienda (ej. "Mercadona", "Walmart", "Gasolinera Repsol", "Restaurante La Casona")
- totalAmount: Monto total final pagado como número decimal positivo (ej. 45.50)
- date: Fecha de la transacción en formato YYYY-MM-DD (si no es visible, usa la fecha de hoy)
- taxAmount: Monto de impuestos/IVA si está visible (número o null)
- suggestedCategory: La categoría que mejor encaje entre las disponibles o una genérica adecuada en español (ej. "Alimentación", "Restaurantes", "Transporte", "Servicios", "Compras")
- suggestedTags: Array de 2 a 4 etiquetas útiles (ej. ["supermercado", "comida", "despensa", "ticket"])
- items: Array de items/productos individuales detectados (cada uno con name, quantity, price si existen)
- notes: Resumen breve o método de pago detectado (ej. "Pago con tarjeta terminada en 4821")
- confidenceScore: Nivel de certeza de 0 a 100`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            taxAmount: { type: Type.NUMBER },
            suggestedCategory: { type: Type.STRING },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  price: { type: Type.NUMBER },
                },
                required: ["name", "price"],
              },
            },
            notes: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
          },
          required: ["merchant", "totalAmount", "date", "suggestedCategory", "suggestedTags"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error in OCR:", error);
    res.status(500).json({
      error: error.message || "Error procesando el recibo con IA",
    });
  }
});

// 1.5. Parse Full Bank Statements (PDF or Images: Nequi, Bancolombia, Daviplata, Nu, etc.)
app.post("/api/gemini/parse-bank-statement", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/png",
      availableCategories = [],
      availableAccounts = [],
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No se proporcionó el documento o imagen del extracto bancario" });
    }

    const ai = getAIClient();
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

    const prompt = `Eres un auditor bancario experto en extractos y estados de cuenta bancarios (como Nequi, Bancolombia, Daviplata, Nu, BBVA, Banco de Bogotá, etc.).
Analiza con máxima precisión la imagen o documento del extracto bancario adjunto.

Categorías disponibles en la app: ${JSON.stringify(availableCategories)}
Cuentas bancarias configuradas por el usuario: ${JSON.stringify(availableAccounts)}

Instrucciones de extracción:
1. Extrae los datos generales del encabezado del extracto:
   - bankName: Nombre de la entidad (ej: "Nequi", "Bancolombia", "Daviplata", "Nu").
   - accountNumber: Número de cuenta o depósito si aparece (ej: "3053855286").
   - accountHolder: Nombre del titular si aparece (ej: "CARLOS GUILLERMO OCAMPO LOPEZ").
   - period: Período del extracto (ej: "2026/08/01 a 2026/08/31").
   - previousBalance: Saldo anterior o inicial si está visible (número).
   - currentBalance: Saldo actual o final si está visible (número).
   - totalCredits: Total de abonos o ingresos en el período si está visible.
   - totalDebits: Total de cargos o egresos en el período si está visible.

2. Extrae CADA UNA de las filas de movimientos/transacciones de la tabla:
   - date: Fecha en formato estándar "YYYY-MM-DD" (por ejemplo si dice "31/08/2026", conviértelo a "2026-08-31").
   - description: Descripción limpia y legible (ej: "Para DIANA MARTINEZ BRINEZ", "Recarga desde Bancolombia", "Retiro en corresponsales MINI").
   - amount: Monto como NÚMERO POSITIVO absoluto (ej: 5700, 18300, 30000, 16000). Sin signos negativos.
   - type: 
       * "expense" si es un débito, cargo, compra, retiro, o si el valor tiene signo negativo (ej: "$-5,700.00", "$-16,000.00").
       * "income" si es un abono, crédito, recarga o ingreso (ej: "$30,000.00", "Recarga desde Bancolombia").
       * "transfer" si es un traslado entre cuentas propias.
   - balanceAfter: Saldo resultante tras el movimiento si la tabla lo incluye, o null.
   - suggestedCategory: Selecciona la mejor categoría de la lista disponible (ej: "Alimentación", "Servicios", "Transferencias", "Efectivo", "Otros").
   - suggestedTags: Etiquetas útiles (ej: ["nequi", "extracto"]).

3. Asegúrate de extraer TODOS los movimientos sin omitir ninguno. Extrae cada fila individual de la tabla del extracto.`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bankName: { type: Type.STRING },
            accountNumber: { type: Type.STRING },
            accountHolder: { type: Type.STRING },
            period: { type: Type.STRING },
            previousBalance: { type: Type.NUMBER },
            currentBalance: { type: Type.NUMBER },
            totalCredits: { type: Type.NUMBER },
            totalDebits: { type: Type.NUMBER },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING, description: "expense, income, or transfer" },
                  balanceAfter: { type: Type.NUMBER },
                  suggestedCategory: { type: Type.STRING },
                  suggestedTags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["date", "description", "amount", "type"],
              },
            },
          },
          required: ["bankName", "transactions"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error in parse-bank-statement:", error);
    res.status(500).json({
      error: error.message || "Error procesando el extracto bancario con IA",
    });
  }
});

// 2. Parse Voice Dictation, Bank SMS, or Invoices/Email text
app.post("/api/gemini/parse-text", async (req, res) => {
  try {
    const {
      text,
      sourceType = "voice", // "voice" | "sms" | "invoice" | "free_text"
      availableCategories = [],
      availableAccounts = [],
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No text provided" });
    }

    const ai = getAIClient();

    const prompt = `Eres un asistente financiero inteligente experto. Tu misión es extraer una o varias transacciones financieras a partir del texto ingresado por el usuario (${sourceType}).

Texto recibido:
"""
${text}
"""

Cuentas del usuario: ${JSON.stringify(availableAccounts)}
Categorías del usuario: ${JSON.stringify(availableCategories)}

Instrucciones:
1. Identifica si es un GASTO ("expense"), INGRESO ("income") o TRANSFERENCIA ("transfer").
2. Extrae el monto numérico positivo.
3. Extrae la descripción o nombre del comercio/fuente.
4. Identifica la fecha (formato YYYY-MM-DD). Si dice "hoy", "ayer", "el martes pasado", calcúlala respecto al momento actual.
5. Asigna la categoría más adecuada de las disponibles o una coherente en español.
6. Si se menciona una cuenta bancaria, tarjeta o efectivo, asigna la más parecida de las cuentas del usuario.
7. Genera etiquetas (#tags) útiles en minúsculas.
8. Si el texto contiene múltiples transacciones (por ejemplo en un extracto de correo o SMS múltiple), devuelve todas las transacciones en el array.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "expense, income o transfer" },
                  amount: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  date: { type: Type.STRING, description: "YYYY-MM-DD" },
                  suggestedCategory: { type: Type.STRING },
                  suggestedAccount: { type: Type.STRING },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  notes: { type: Type.STRING },
                },
                required: ["type", "amount", "description", "suggestedCategory"],
              },
            },
            detectedSummary: { type: Type.STRING },
          },
          required: ["transactions"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error in parse-text:", error);
    res.status(500).json({
      error: error.message || "Error analizando el texto financiero",
    });
  }
});

// 2.1 AUTOMATED WEBHOOK INGESTION ENDPOINT (For MacroDroid, Tasker, Apple Shortcuts, Zapier, Make, Email Forwarders)
app.post("/api/webhook/auto-ingest", async (req, res) => {
  try {
    // Extract text from various standard webhook formats
    let incomingText = "";
    if (typeof req.body === "string") {
      incomingText = req.body;
    } else if (req.body) {
      incomingText =
        req.body.text ||
        req.body.message ||
        req.body.body ||
        req.body.sms ||
        req.body.content ||
        req.body.rawText ||
        JSON.stringify(req.body);
    }

    if (!incomingText || !incomingText.trim()) {
      return res.status(400).json({
        success: false,
        error: "No text content found in webhook payload. Send { text: '...' } or raw SMS/Email string.",
      });
    }

    const ai = getAIClient();

    const prompt = `Eres el motor de ingesta automática y clasificación financiera de FinanFlow AI. Analiza este SMS bancario, correo de factura o notificación de billetera digital (Bancolombia, Nequi, Daviplata, etc.) y extrae la transacción financiera respetando estrictamente estas reglas:

Reglas bancarias específicas:
1. BANCOLOMBIA:
   - "Compraste" o "Transferiste" / "Trasferiste" / "Pagaste" -> type: "expense" (Gasto). account: "Bancolombia".
   - "Retiraste" -> type: "transfer" (Transferencia de Bancolombia a Efectivo). account: "Bancolombia", notes: "Retiro de cajero Bancolombia a Efectivo", description: "Retiro Cajero Bancolombia".
   - "Te transfirieron" / "Recibiste" -> type: "income" (Ingreso).

2. NEQUI:
   - "Pagaste" o "Enviaste" -> type: "expense" (Gasto). account: "Nequi".
   - "Sacaste" / "Retiraste" -> type: "transfer" (Transferencia de Nequi a Efectivo). account: "Nequi", notes: "Retiro Nequi a Efectivo".
   - "Te enviaron" / "Recibiste" -> type: "income" (Ingreso).

3. DAVIPLATA:
   - "Pagaste", "Compra aprobada", "Pago exitoso", "Pasaste plata" -> type: "expense" (Gasto). account: "Daviplata".
   - "Acabas de sacar", "Sacaste plata", "Retiraste" -> type: "transfer" (Transferencia de Daviplata a Efectivo). account: "Daviplata", notes: "Retiro Daviplata a Efectivo", description: "Retiro Cajero Daviplata".
   - "Te pasaron plata", "Recibiste" -> type: "income" (Ingreso).

Texto entrante a procesar:
"""
${incomingText}
"""

Extrae en JSON:
1. type: "expense" | "income" | "transfer".
2. amount: Número positivo exacto (ej: si dice $50.000, extrae 50000).
3. merchant / description: Nombre limpio del comercio, persona o motivo (ej: "Supermercado Éxito", "Juan Pérez", "Restaurante Wok", "Retiro Cajero").
4. date: Fecha en formato YYYY-MM-DD (si no dice año, asume ${new Date().toISOString().split("T")[0]}).
5. category: Categoría en español (ej: "Alimentación", "Transporte", "Servicios", "Hogar", "Ocio", "Salud", "Transferencias", "Retiro de Efectivo").
6. account: "Bancolombia", "Nequi", "Daviplata", "Tarjeta", "Efectivo", etc.
7. notes: Detalle original o referencia detectada.
8. tags: Array de tags (ej: ["bancolombia", "sms-auto", "retiro"]).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "expense, income o transfer" },
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            date: { type: Type.STRING },
            category: { type: Type.STRING },
            account: { type: Type.STRING },
            notes: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["type", "amount", "description", "category"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    res.json({
      success: true,
      message: "Transacción procesada e interpretada con éxito por FinanFlow AI",
      rawReceived: incomingText.substring(0, 150),
      transaction: {
        type: parsed.type || "expense",
        amount: Math.abs(parsed.amount || 0),
        description: parsed.description || "Gasto automático",
        date: parsed.date || new Date().toISOString().split("T")[0],
        category: parsed.category || "General",
        account: parsed.account || "Principal",
        notes: parsed.notes || `Auto-capturado vía Webhook (${new Date().toLocaleTimeString()})`,
        tags: parsed.tags || ["auto-webhook", "ia"],
        source: "webhook_auto",
      },
    });
  } catch (error: any) {
    console.error("Error in auto-ingest webhook:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error procesando la ingesta automática con IA",
    });
  }
});

// 3. AI Financial Advisor & Smart Savings Reports
app.post("/api/gemini/advisor", async (req, res) => {
  try {
    const {
      period = "monthly", // "weekly" | "monthly"
      financialSummary,
      currency = "EUR",
    } = req.body;

    const ai = getAIClient();

    const prompt = `Eres un asesor financiero personal de élite, empático, analítico y motivador.
Analiza la siguiente situación financiera del usuario para el periodo (${period}):

Moneda: ${currency}
Datos Financieros:
${JSON.stringify(financialSummary, null, 2)}

Tu tarea es generar un informe de ahorro y diagnóstico financiero exhaustivo:
1. Puntuación de salud financiera de 0 a 100 (score).
2. Nivel de salud financiera ("Excelente", "Buena", "Atención Requerida", "Crítica").
3. Resumen ejecutivo conciso del periodo (2-3 oraciones clave).
4. Fugas de dinero detectadas (gastos hormiga, suscripciones innecesarias o categorías sobrepasadas).
5. 3 a 5 consejos prácticos de ahorro accionables con estimación de ahorro potencial.
6. Comparativa respecto al presupuesto fijado.
7. Metas de ahorro recomendadas para la próxima semana/mes.

Responde en español con tono profesional, claro y motivador en formato JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER },
            healthStatus: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            budgetStatusAnalysis: { type: Type.STRING },
            potentialMonthlySavings: { type: Type.NUMBER },
            moneyLeaks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  estimatedImpact: { type: Type.NUMBER },
                },
                required: ["category", "description", "estimatedImpact"],
              },
            },
            actionableTips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  potentialSavings: { type: Type.NUMBER },
                  difficulty: { type: Type.STRING, description: "Fácil, Medio, Desafiante" },
                },
                required: ["title", "description", "potentialSavings"],
              },
            },
            savingsTargetRecommendation: { type: Type.STRING },
          },
          required: [
            "healthScore",
            "healthStatus",
            "executiveSummary",
            "moneyLeaks",
            "actionableTips",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error in advisor:", error);
    res.status(500).json({
      error: error.message || "Error generando el informe de ahorro",
    });
  }
});

// 4. Analyze Email Invoices from Gmail with Gemini AI
app.post("/api/gmail/analyze-invoices", async (req, res) => {
  try {
    const { emails = [], availableCategories = [], availableAccounts = [] } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "No emails provided to analyze" });
    }

    const ai = getAIClient();

    const prompt = `Eres un auditor financiero experto en facturación electrónica (DIAN, comprobantes de pago, recibos de servicios, compras de comercio, transferencias bancarias y recibos de suscripciones).
Tu objetivo es analizar los siguientes correos electrónicos encontrados en la bandeja de entrada del usuario y extraer con absoluta precisión las facturas o cobros financieros reales.

Categorías disponibles en la app: ${JSON.stringify(availableCategories)}
Cuentas bancarias configuradas: ${JSON.stringify(availableAccounts)}

Lista de correos a procesar:
${JSON.stringify(emails, null, 2)}

Instrucciones:
1. Para CADA correo que contenga una factura electrónica, recibo de pago, cobro de servicios (luz, agua, gas, internet), factura de comercio (Éxito, Falabella, Amazon, MercadoLibre, Rappi, Uber, Didi, Netflix, Spotify, etc.) o transferencia bancaria (Bancolombia, Nequi, Daviplata, etc.):
   - id: Id del correo original o un id único generado
   - merchant: Nombre limpio del emisor o comercio (ej. "Empresas Públicas de Medellín E.S.P.", "Nequi", "Claro Colombia", "Uber", "Mercado Libre", "Éxito")
   - totalAmount: Monto total a pagar o pagado como número positivo (ej. 145000)
   - date: Fecha de la factura o transacción (formato YYYY-MM-DD).
   - invoiceNumber: Número de factura electrónica o prefijo DIAN si existe (ej. "FE-12948", "REC-84920"), o null.
   - type: "expense" (Gasto o factura pagada), "bill_reminder" (Factura pendiente por pagar o factura con fecha de vencimiento próxima), o "income" (Ingreso o comprobante de dinero recibido).
   - dueDate: Fecha de vencimiento si es una factura por pagar (formato YYYY-MM-DD), o null.
   - suggestedCategory: La categoría del usuario que mejor encaje (ej. "Servicios Públicos", "Alimentación", "Transporte", "Tecnología", etc.).
   - suggestedAccount: La cuenta más adecuada (ej. "Bancolombia", "Nequi", "Daviplata", "Cuenta Nu", etc.) si se deduce del correo.
   - confidenceScore: Nivel de certeza de 0 a 100.
   - summary: Resumen explicativo de una sola línea (ej. "Factura electrónica por servicios de fibra óptica hogar").
   - emailSubject: Asunto original del correo.
   - emailDate: Fecha del correo.

2. Si un correo NO contiene ningún movimiento financiero, factura ni recibo (por ejemplo spam o publicidad sin cobro), NO lo incluyas en la lista final.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedInvoices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  merchant: { type: Type.STRING },
                  totalAmount: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                  dueDate: { type: Type.STRING },
                  invoiceNumber: { type: Type.STRING },
                  type: { type: Type.STRING, description: "expense, bill_reminder o income" },
                  suggestedCategory: { type: Type.STRING },
                  suggestedAccount: { type: Type.STRING },
                  confidenceScore: { type: Type.NUMBER },
                  summary: { type: Type.STRING },
                  emailSubject: { type: Type.STRING },
                  emailDate: { type: Type.STRING },
                },
                required: ["id", "merchant", "totalAmount", "date", "type", "suggestedCategory", "summary"],
              },
            },
            totalFound: { type: Type.NUMBER },
            scanSummary: { type: Type.STRING },
          },
          required: ["detectedInvoices"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error analyzing invoices with Gemini:", error);
    res.status(500).json({
      error: error.message || "Error analizando las facturas electrónicas de Gmail con IA",
    });
  }
});

// Vite middleware for development / Static file serving for production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FinanFlow server running on http://localhost:${PORT}`);
  });
}

setupViteOrStatic();
