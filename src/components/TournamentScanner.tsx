import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScanLine, Camera, Upload, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TournamentScannerProps {
  onScanSuccess?: (code: string) => void;
}

const TournamentScanner = ({ onScanSuccess }: TournamentScannerProps) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<'camera' | 'upload' | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleCodeDetected = async (code: string) => {
    // Stop scanning
    stopScanner();
    
    // Extract private code from URL or use directly
    let privateCode = code;
    
    // Check if it's a URL with private_code parameter
    try {
      const url = new URL(code);
      const codeParam = url.searchParams.get('code') || url.searchParams.get('private_code');
      if (codeParam) {
        privateCode = codeParam;
      }
    } catch {
      // Not a URL, use as-is (might be just the code)
    }
    
    // Clean up the code
    privateCode = privateCode.trim().toUpperCase();
    
    if (privateCode.length < 4) {
      toast({
        title: 'Invalid Code',
        description: 'The scanned QR code is not a valid tournament code.',
        variant: 'destructive'
      });
      return;
    }
    
    if (onScanSuccess) {
      onScanSuccess(privateCode);
    }
    
    // Navigate to join page with the code
    navigate(`/local-tournament?code=${privateCode}`);
    setOpen(false);
    
    toast({
      title: 'Tournament Found!',
      description: `Joining with code: ${privateCode}`,
    });
  };

  const startCameraScanner = async () => {
    setMode('camera');
    setScanning(true);
    
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        () => {
          // QR code not found, continue scanning
        }
      );
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions or try uploading an image.',
        variant: 'destructive'
      });
      setScanning(false);
      setMode(null);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setMode('upload');
    setProcessing(true);
    
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-upload');
      const result = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleCodeDetected(result);
    } catch (error) {
      console.error('Error scanning image:', error);
      toast({
        title: 'Scan Failed',
        description: 'Could not find a QR code in the image. Please try another image.',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
      setMode(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    setMode(null);
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
      >
        <ScanLine className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Tournament Scanner
            </DialogTitle>
            <DialogDescription>
              Scan a tournament QR code to join instantly
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode Selection */}
            {!mode && !scanning && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={startCameraScanner}
                >
                  <Camera className="h-8 w-8 text-primary" />
                  <span className="text-sm">Use Camera</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-8 w-8 text-primary" />
                  )}
                  <span className="text-sm">Upload Image</span>
                </Button>
              </div>
            )}

            {/* Camera Scanner View */}
            {scanning && (
              <div className="space-y-3">
                <div 
                  id="qr-reader" 
                  className="rounded-lg overflow-hidden bg-muted aspect-square"
                />
                <p className="text-center text-sm text-muted-foreground">
                  Point your camera at a tournament QR code
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    stopScanner();
                    setMode(null);
                  }}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Scan
                </Button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Hidden div for file scanning */}
            <div id="qr-reader-upload" className="hidden" />

            {/* Processing overlay */}
            {processing && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Scanning image...</p>
              </div>
            )}

            {/* Info text */}
            {!mode && !scanning && !processing && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Scan QR codes from local tournament organizers to join their tournaments instantly
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TournamentScanner;
