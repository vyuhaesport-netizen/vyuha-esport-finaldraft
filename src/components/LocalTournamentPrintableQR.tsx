import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Download, Printer } from 'lucide-react';

interface LocalTournamentPrintableQRProps {
  tournamentId: string;
  tournamentTitle: string;
  privateCode: string;
  institutionName: string;
  onDownload?: () => void;
}

const LocalTournamentPrintableQR = ({ 
  tournamentId, 
  tournamentTitle, 
  privateCode, 
  institutionName,
  onDownload 
}: LocalTournamentPrintableQRProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  const joinUrl = `${window.location.origin}/join-local?code=${privateCode}`;

  const downloadA4PDF = async () => {
    if (!printRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // A4 dimensions at 96 DPI (portrait)
      const a4Width = 794;
      const a4Height = 1123;
      canvas.width = a4Width;
      canvas.height = a4Height;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, a4Width, a4Height);

      // Header - Institution name
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 28px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(institutionName, a4Width / 2, 80);

      // Tournament title
      ctx.font = 'bold 36px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#f97316';
      ctx.fillText(tournamentTitle, a4Width / 2, 130);

      // Draw QR code
      const svgElement = printRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const qrImage = new Image();
        await new Promise<void>((resolve) => {
          qrImage.onload = () => {
            const qrSize = 350;
            const qrX = (a4Width - qrSize) / 2;
            const qrY = 180;
            
            // QR background with border
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 16);
            ctx.fill();
            ctx.stroke();
            
            ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

            // Logo in center of QR
            const logo = new Image();
            logo.crossOrigin = 'anonymous';
            logo.onload = () => {
              const logoSize = 60;
              const logoX = qrX + (qrSize - logoSize) / 2;
              const logoY = qrY + (qrSize - logoSize) / 2;

              ctx.beginPath();
              ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 8, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();

              ctx.beginPath();
              ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 4, 0, Math.PI * 2);
              ctx.strokeStyle = '#f97316';
              ctx.lineWidth = 3;
              ctx.stroke();

              ctx.save();
              ctx.beginPath();
              ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
              ctx.clip();
              ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
              ctx.restore();

              // Private code
              ctx.fillStyle = '#1a1a1a';
              ctx.font = 'bold 24px Inter, system-ui, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(`Tournament Code: ${privateCode}`, a4Width / 2, qrY + qrSize + 70);

              // Registration link
              ctx.fillStyle = '#6b7280';
              ctx.font = '16px Inter, system-ui, sans-serif';
              ctx.fillText('Scan QR or visit:', a4Width / 2, qrY + qrSize + 110);
              
              ctx.fillStyle = '#0070f3';
              ctx.font = '18px Inter, system-ui, sans-serif';
              ctx.fillText(joinUrl, a4Width / 2, qrY + qrSize + 135);

              // Rules section
              const rulesY = qrY + qrSize + 200;
              
              ctx.fillStyle = '#1a1a1a';
              ctx.font = 'bold 24px Inter, system-ui, sans-serif';
              ctx.fillText('📋 Registration Rules', a4Width / 2, rulesY);

              const rules = [
                '1. All player game names and IDs must match exactly with your registered UID',
                '2. Teams must be available on the tournament date',
                '3. No exits or withdrawals allowed after registration'
              ];

              ctx.textAlign = 'left';
              ctx.font = '18px Inter, system-ui, sans-serif';
              ctx.fillStyle = '#374151';

              const ruleStartX = 80;
              let ruleY = rulesY + 50;

              rules.forEach((rule) => {
                // Wrap text if too long
                const maxWidth = a4Width - 160;
                const words = rule.split(' ');
                let line = '';
                
                for (const word of words) {
                  const testLine = line + word + ' ';
                  const metrics = ctx.measureText(testLine);
                  if (metrics.width > maxWidth && line !== '') {
                    ctx.fillText(line.trim(), ruleStartX, ruleY);
                    line = word + ' ';
                    ruleY += 28;
                  } else {
                    line = testLine;
                  }
                }
                ctx.fillText(line.trim(), ruleStartX, ruleY);
                ruleY += 45;
              });

              // Footer
              ctx.textAlign = 'center';
              ctx.fillStyle = '#f97316';
              ctx.font = 'bold 20px Inter, system-ui, sans-serif';
              ctx.fillText('VYUHA ESPORT', a4Width / 2, a4Height - 60);
              
              ctx.fillStyle = '#9ca3af';
              ctx.font = '14px Inter, system-ui, sans-serif';
              ctx.fillText('India\'s Premier Esports Platform', a4Width / 2, a4Height - 35);

              // Download
              const link = document.createElement('a');
              link.download = `vyuha-${tournamentTitle.replace(/\s+/g, '-').toLowerCase()}-a4-qr.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();

              URL.revokeObjectURL(svgUrl);
              onDownload?.();
            };
            logo.src = vyuhaLogo;
            resolve();
          };
        });
        qrImage.src = svgUrl;
      }
    } catch (error) {
      console.error('Error downloading A4 QR:', error);
    }
  };

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tournament QR - ${tournamentTitle}</title>
        <style>
          @page { size: A4; margin: 40px; }
          body { font-family: Inter, system-ui, sans-serif; text-align: center; padding: 20px; }
          .header { margin-bottom: 20px; }
          .institution { font-size: 20px; font-weight: bold; color: #1a1a1a; }
          .title { font-size: 28px; font-weight: bold; color: #f97316; margin-top: 8px; }
          .qr-container { display: flex; justify-content: center; margin: 30px 0; }
          .code { font-size: 20px; font-weight: bold; margin: 20px 0; }
          .link { color: #0070f3; font-size: 14px; }
          .rules-title { font-size: 20px; font-weight: bold; margin: 40px 0 20px; }
          .rule { text-align: left; font-size: 16px; margin: 12px 40px; color: #374151; }
          .footer { margin-top: 60px; color: #f97316; font-weight: bold; font-size: 18px; }
          .tagline { color: #9ca3af; font-size: 12px; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="institution">${institutionName}</div>
          <div class="title">${tournamentTitle}</div>
        </div>
        <div class="qr-container">
          <img src="${joinUrl}" alt="QR Code" style="width: 300px; height: 300px;" />
        </div>
        <div class="code">Tournament Code: ${privateCode}</div>
        <div class="link">${joinUrl}</div>
        <div class="rules-title">📋 Registration Rules</div>
        <div class="rule">1. All player game names and IDs must match exactly with your registered UID</div>
        <div class="rule">2. Teams must be available on the tournament date</div>
        <div class="rule">3. No exits or withdrawals allowed after registration</div>
        <div class="footer">VYUHA ESPORT</div>
        <div class="tagline">India's Premier Esports Platform</div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        ref={printRef}
        className="relative bg-white rounded-2xl p-6 shadow-lg border border-border"
      >
        <QRCodeSVG
          value={joinUrl}
          size={200}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#1a1a1a"
        />
        
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

      <div className="text-center space-y-1">
        <p className="text-xs font-mono font-bold text-primary">Code: {privateCode}</p>
        <p className="text-[10px] text-muted-foreground">Scan to join tournament</p>
      </div>

      <div className="flex gap-2 w-full">
        <Button 
          onClick={downloadA4PDF}
          className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 text-xs h-8"
        >
          <Download className="h-3 w-3" />
          Download A4
        </Button>
        <Button 
          variant="outline"
          onClick={handlePrint}
          className="gap-2 text-xs h-8"
        >
          <Printer className="h-3 w-3" />
          Print
        </Button>
      </div>

      {/* Rules Preview */}
      <div className="w-full bg-muted/50 rounded-lg p-3 text-left">
        <p className="text-[10px] font-semibold text-foreground mb-1.5">📋 Rules on printout:</p>
        <ol className="text-[9px] text-muted-foreground space-y-0.5 list-decimal list-inside">
          <li>Player game names & IDs must match UID</li>
          <li>Teams must be available on tournament date</li>
          <li>No exits after registration</li>
        </ol>
      </div>
    </div>
  );
};

export default LocalTournamentPrintableQR;
