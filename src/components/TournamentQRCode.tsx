import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Download } from 'lucide-react';

interface TournamentQRCodeProps {
  tournamentId: string;
  tournamentTitle: string;
  onDownload?: () => void;
}

const TournamentQRCode = ({ tournamentId, tournamentTitle, onDownload }: TournamentQRCodeProps) => {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  
  const tournamentUrl = `${window.location.origin}/tournament/${tournamentId}`;

  const downloadQR = async () => {
    if (!qrContainerRef.current) return;

    try {
      // Create a canvas to draw the QR code with logo
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      const size = 400;
      const padding = 40;
      const totalSize = size + padding * 2;
      canvas.width = totalSize;
      canvas.height = totalSize + 60; // Extra space for title

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
      ctx.fill();

      // Get SVG element
      const svgElement = qrContainerRef.current.querySelector('svg');
      if (!svgElement) return;

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const qrImage = new Image();
      qrImage.onload = () => {
        // Draw QR code
        ctx.drawImage(qrImage, padding, padding, size, size);

        // Draw logo in center
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
          const logoSize = 70;
          const logoX = (totalSize - logoSize) / 2;
          const logoY = padding + (size - logoSize) / 2;

          // Draw white circle behind logo
          ctx.beginPath();
          ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Draw logo border
          ctx.beginPath();
          ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Draw logo
          ctx.save();
          ctx.beginPath();
          ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          ctx.restore();

          // Draw title
          ctx.fillStyle = '#1a1a1a';
          ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          const titleText = tournamentTitle.length > 30 
            ? tournamentTitle.substring(0, 30) + '...' 
            : tournamentTitle;
          ctx.fillText(titleText, totalSize / 2, totalSize + 30);

          // Draw "Vyuha Esport" branding
          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.fillText('VYUHA ESPORT', totalSize / 2, totalSize + 50);

          // Download
          const link = document.createElement('a');
          link.download = `vyuha-${tournamentTitle.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();

          URL.revokeObjectURL(svgUrl);
          onDownload?.();
        };
        logo.src = vyuhaLogo;
      };
      qrImage.src = svgUrl;
    } catch (error) {
      console.error('Error downloading QR:', error);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* QR Code Container */}
      <div 
        ref={qrContainerRef}
        className="relative bg-white rounded-2xl p-6 shadow-lg"
      >
        <QRCodeSVG
          value={tournamentUrl}
          size={200}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#1a1a1a"
        />
        
        {/* Centered Logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full scale-125" />
            <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary ring-offset-2 ring-offset-white">
              <img 
                src={vyuhaLogo} 
                alt="Vyuha" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scan instruction */}
      <p className="text-sm text-muted-foreground text-center">
        Scan to view tournament details
      </p>

      {/* Download Button */}
      <Button 
        onClick={downloadQR}
        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
      >
        <Download className="h-4 w-4" />
        Download QR Code
      </Button>
    </div>
  );
};

export default TournamentQRCode;
