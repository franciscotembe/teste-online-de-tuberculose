import React, { useState, useRef } from 'react';
import { Upload, Loader } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const API_TIMEOUT = 300000; // 30 segundos
const API_URL = 'https://8004-01jmw8ynkyfpm5jpz096pk52m6.cloudspaces.litng.ai/predict/';

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<{ predicao: string, probabilidade: number } | null>(null); // Alterado para objeto
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Tipo de arquivo inválido. Por favor, envie uma imagem JPG, PNG ou WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Arquivo muito grande. O tamanho máximo permitido é 5MB.";
    }
    return null;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    setResult(null); // Resetar resultado ao trocar imagem

    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        event.target.value = ''; // Reset input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.onerror = () => setError("Erro ao ler o arquivo. Por favor, tente novamente.");
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);
    setResult(null); // Esconder resultado antes de analisar

    const formData = new FormData();
    try {
      const base64Data = selectedImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArrays.push(new Uint8Array(byteNumbers));
      }

      const imageBlob = new Blob(byteArrays, { type: 'image/png' });
      formData.append("file", imageBlob, "image.png");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erro do servidor (${response.status}): ${await response.text()}`);
      }

      const data = await response.json();
      if (!data || typeof data.predicao === 'undefined' || typeof data.probabilidade === 'undefined') {
        throw new Error("Resposta inválida do servidor.");
      }

      setResult({
        predicao: data.predicao,
        probabilidade: data.probabilidade, // Valor da probabilidade
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      setResult({ predicao: "Erro na Análise", probabilidade: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
      };
      reader.onerror = () => setError("Erro ao ler o arquivo. Por favor, tente novamente.");
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">
          Análise de Tuberculose por IA's
        </h1>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-8 text-center">
            {selectedImage ? (
              <div className="mb-4 relative group">
                <img
                  src={selectedImage}
                  alt="Raio-X do Paciente"
                  className="max-h-[400px] mx-auto border rounded-lg shadow-md"
                />
                <div 
                  className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-white font-medium">Clique para trocar a imagem</p>
                </div>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">Clique para fazer upload da imagem do Raio-X</p>
                <p className="text-sm text-gray-400">ou arraste e solte aqui</p>
                <p className="text-xs text-gray-400 mt-2">
                  Formatos aceitos: JPG, PNG, WebP (máx. 5MB)
                </p>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept={ALLOWED_TYPES.join(',')}
              className="hidden"
            />
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleAnalyze}
              disabled={!selectedImage || isLoading}
              className={`px-6 py-2 rounded-full text-white font-medium flex items-center gap-2 ${
                selectedImage && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              } transition-colors`}
            >
              {isLoading && <Loader className="w-5 h-5 animate-spin" />}
              {isLoading ? 'Analisando...' : 'Analisar Imagem'}
            </button>

            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Exibir resultado apenas se já foi feita uma análise */}
            {result !== null && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg w-full text-center">
                <h2 className="text-lg font-semibold mb-2">Resultado:</h2>
                <p className={`text-xl font-bold ${
                  result.predicao.includes("Erro") ? "text-red-600" : "text-blue-600"
                }`}>
                  {result.predicao}
                </p>
                <p className="text-lg text-gray-500">
                  Confiança: {Math.round(result.probabilidade * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
