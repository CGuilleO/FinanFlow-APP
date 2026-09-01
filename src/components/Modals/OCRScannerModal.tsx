import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Check, AlertCircle, X, Receipt, Store, Calendar, Tag, Layers, RefreshCw } from 'lucide-react';
import { Account, Category, OCRScanResult, UserSettings } from '../../types';
import { addTransaction, formatCurrency } from '../../utils/storage';
import confetti from 'canvas-confetti';

interface OCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  onSuccess: () => void;
  initialImageBlob?: Blob | null;
}

export const OCRScannerModal: React.FC<OCRScannerModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  settings,
  onSuccess,
  initialImageBlob,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form edit fields after scan
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || '');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialImageBlob && isOpen) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImagePreview(base64);
        analyzeReceiptWithAI(base64, initialImageBlob.type || 'image/jpeg');
      };
      reader.readAsDataURL(initialImageBlob);
    }
  }, [initialImageBlob, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      analyzeReceiptWithAI(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeReceiptWithAI = async (base64Data: string, mimeType: string) => {
    setIsScanning(true);
    setError(null);

    try {
      const availableCatNames = categories.map((c) => c.name);
      const res = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          availableCategories: availableCatNames,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al procesar el ticket con IA');
      }

      const result = await res.json();
      const ocrData: OCRScanResult = result.data;
      setScanResult(ocrData);

      // Pre-fill fields
      setMerchant(ocrData.merchant || 'Gasto con ticket');
      setAmount(ocrData.totalAmount || 0);
      setDate(ocrData.date || new Date().toISOString().split('T')[0]);
      setTags(ocrData.suggestedTags || ['ticket', 'ocr']);
      setNotes(ocrData.notes || (ocrData.items ? `Items: ${ocrData.items.map(i => `${i.name} (${i.price}€)`).join(', ')}` : ''));

      // Find matching category
      const matchedCategory = categories.find((c) =>
        c.name.toLowerCase().includes((ocrData.suggestedCategory || '').toLowerCase()) ||
        (ocrData.suggestedCategory || '').toLowerCase().includes(c.name.toLowerCase())
      );
      if (matchedCategory) {
        setSelectedCategory(matchedCategory.id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo escanear el ticket. Verifica la imagen e inténtalo de nuevo.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSaveTransaction = () => {
    if (!merchant || amount <= 0) {
      setError('Por favor revisa el monto y la descripción del gasto');
      return;
    }

    addTransaction({
      type: 'expense',
      amount,
      description: merchant,
      date,
      categoryId: selectedCategory,
      accountId: selectedAccount,
      tags,
      notes,
      receiptImage: imagePreview || undefined,
      items: scanResult?.items,
      source: 'ocr',
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Escáner Inteligente de Tickets
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> IA Gemini
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extrae comercio, monto, fecha, desglose de items y categoría automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload / Capture Section */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                Sube una foto o captura el recibo de compra
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                Arrastra una imagen de tu ticket de supermercado, restaurante o factura aquí, o pulsa para tomar una foto.
              </p>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
              >
                Seleccionar Foto de Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Receipt Preview Card & Re-scan */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <img
                  src={imagePreview}
                  alt="Ticket Preview"
                  className="w-20 h-24 object-cover rounded-lg shadow border border-slate-300 dark:border-slate-600"
                />
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Receipt className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Imagen del Ticket cargada
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {isScanning
                      ? 'Analizando con Gemini OCR...'
                      : scanResult
                      ? `Detectado con ${scanResult.confidenceScore || 95}% de confianza`
                      : 'Listo para procesar'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setScanResult(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors"
                  >
                    Cambiar Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => imagePreview && analyzeReceiptWithAI(imagePreview, 'image/jpeg')}
                    disabled={isScanning}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    Re-analizar
                  </button>
                </div>
              </div>

              {/* Scanning indicator */}
              {isScanning && (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin" />
                    <Sparkles className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Gemini está leyendo el ticket y calculando montos...
                  </p>
                </div>
              )}

              {/* Parsed / Edit Fields Form */}
              {!isScanning && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Merchant / Description */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-indigo-500" />
                        Comercio / Descripción *
                      </label>
                      <input
                        type="text"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                        placeholder="Ej. Mercadona, Restaurante, etc."
                      />
                    </div>

                    {/* Total Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                        Monto Total ({settings.currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount || ''}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-emerald-600 dark:text-emerald-400"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Fecha del Gasto
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        Categoría
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                      >
                        {categories
                          .filter((c) => c.type === 'expense')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Account */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Cuenta / Método de Pago
                      </label>
                      <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatCurrency(a.currentBalance, settings)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tag input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        Etiquetas (#tags)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          placeholder="Añadir etiqueta..."
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-3 py-2 text-xs font-medium text-white bg-slate-700 hover:bg-slate-800 rounded-xl"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rendered Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Items list detected by OCR */}
                  {scanResult?.items && scanResult.items.length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                        Items Detectados en el Ticket ({scanResult.items.length})
                      </span>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {scanResult.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-700 dark:text-slate-300 py-0.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                            <span>{item.name} {item.quantity ? `(x${item.quantity})` : ''}</span>
                            <span className="font-semibold">{formatCurrency(item.price, settings)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes / Tax */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Notas del Ticket
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Detalles adicionales, garantía, etc."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          {imagePreview && !isScanning && (
            <button
              type="button"
              onClick={handleSaveTransaction}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              Guardar Gasto ({formatCurrency(amount, settings)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
