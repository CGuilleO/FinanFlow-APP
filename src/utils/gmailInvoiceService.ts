/**
 * Service to interact with the official Gmail REST API using OAuth Access Token
 */

export interface RawGmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
  bodySnippet?: string;
}

export interface DetectedInvoiceItem {
  id: string;
  merchant: string;
  totalAmount: number;
  date: string;
  dueDate?: string;
  invoiceNumber?: string;
  type: 'expense' | 'bill_reminder' | 'income';
  suggestedCategory: string;
  suggestedAccount?: string;
  confidenceScore?: number;
  summary: string;
  emailSubject?: string;
  emailDate?: string;
  selected?: boolean;
}

/**
 * Search and retrieve invoice/receipt messages from user's Gmail
 */
export async function searchGmailInvoices(
  accessToken: string,
  daysBack: number = 30,
  maxResults: number = 25
): Promise<RawGmailMessage[]> {
  if (!accessToken) {
    throw new Error('Se requiere un token de acceso válido de Google.');
  }

  // Calculate after:YYYY/MM/DD date filter
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  const afterDateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

  // Comprehensive query for Colombian & international electronic invoices, receipts, and bank transfers
  const query = `after:${afterDateStr} ("factura electrónica" OR "factura electronica" OR "recibo de pago" OR "comprobante de pago" OR "comprobante de transferencia" OR "DIAN" OR "compra aprobada" OR "pago exitoso" OR "cuenta de cobro" OR "invoice" OR "receipt" OR "Bancolombia" OR "Nequi" OR "Daviplata" OR "Éxito" OR "Claro" OR "EPM" OR "Enel" OR "Tigo" OR "Uber" OR "Rappi" OR "Mercado Libre")`;

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

  const response = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errMsg = errorData?.error?.message || response.statusText;
    if (response.status === 401) {
      throw new Error('La sesión de Google ha expirado o requiere reautorización.');
    }
    throw new Error(`Error consultando Gmail: ${errMsg}`);
  }

  const listData = await response.json();
  const messages = listData.messages || [];

  if (messages.length === 0) {
    return [];
  }

  // Fetch message details in parallel (capped at 15 for fast processing)
  const detailPromises = messages.slice(0, 15).map(async (msg: { id: string }) => {
    try {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      const msgRes = await fetch(msgUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!msgRes.ok) return null;

      const fullData = await msgRes.json();
      const headers = fullData.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const date = getHeader('Date');
      const snippet = fullData.snippet || '';

      // Extract body text if available
      let bodyText = snippet;
      if (fullData.payload?.parts) {
        for (const part of fullData.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            try {
              const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
              bodyText += ' ' + decoded.substring(0, 1000);
            } catch (e) {
              // ignore base64 decoding error
            }
          }
        }
      }

      return {
        id: msg.id,
        threadId: fullData.threadId,
        subject,
        from,
        date,
        snippet,
        bodySnippet: bodyText.substring(0, 1500),
      } as RawGmailMessage;
    } catch (e) {
      console.warn(`Error reading Gmail message ${msg.id}:`, e);
      return null;
    }
  });

  const resolved = await Promise.all(detailPromises);
  return resolved.filter((m): m is RawGmailMessage => m !== null);
}

/**
 * Call backend AI endpoint to extract structured invoice data from raw Gmail messages
 */
export async function analyzeInvoicesWithAI(
  emails: RawGmailMessage[],
  availableCategories: string[],
  availableAccounts: string[]
): Promise<{ detectedInvoices: DetectedInvoiceItem[]; scanSummary?: string }> {
  const response = await fetch('/api/gmail/analyze-invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emails,
      availableCategories,
      availableAccounts,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al analizar las facturas con IA.');
  }

  const result = await response.json();
  const invoices: DetectedInvoiceItem[] = (result.data?.detectedInvoices || []).map((inv: any) => ({
    ...inv,
    selected: true, // Default selected for easy batch importing
  }));

  return {
    detectedInvoices: invoices,
    scanSummary: result.data?.scanSummary,
  };
}
