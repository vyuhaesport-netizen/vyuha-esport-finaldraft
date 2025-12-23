interface Player {
  user_id: string;
  username: string | null;
  full_name: string | null;
  in_game_name?: string | null;
}

interface Winner {
  position: number;
  username: string | null;
  full_name: string | null;
  amount: number;
}

export const generatePlayersPDF = (
  tournamentName: string,
  players: Player[],
  tournamentDate: string
) => {
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tournamentName} - Players List</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #f97316;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      margin: 0 0 10px 0;
    }
    .header p {
      color: #666;
      margin: 0;
    }
    .brand {
      color: #f97316;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f97316;
      color: white;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tournamentName}</h1>
    <p>Date: ${new Date(tournamentDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
    <p class="brand">VYUHA ESPORT</p>
  </div>
  
  <h2>Registered Players (${players.length})</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Username</th>
        <th>In-Game Name</th>
      </tr>
    </thead>
    <tbody>
      ${players.map((player, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${player.full_name || '-'}</td>
          <td>@${player.username || '-'}</td>
          <td>${player.in_game_name || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>Powered by Vyuha Esport</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const generateWinnersPDF = (
  tournamentName: string,
  winners: Winner[],
  tournamentDate: string,
  totalPrizePool: number
) => {
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tournamentName} - Winners</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #f97316;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      margin: 0 0 10px 0;
    }
    .header p {
      color: #666;
      margin: 0;
    }
    .brand {
      color: #f97316;
      font-weight: bold;
    }
    .trophy {
      font-size: 48px;
      text-align: center;
      margin: 20px 0;
    }
    .prize-pool {
      text-align: center;
      font-size: 24px;
      color: #16a34a;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f97316;
      color: white;
    }
    .position-1 { background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%); }
    .position-2 { background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%); }
    .position-3 { background: linear-gradient(135deg, #cd7f32 0%, #e8a55c 100%); }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏆 ${tournamentName}</h1>
    <p>Date: ${new Date(tournamentDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
    <p class="brand">VYUHA ESPORT</p>
  </div>
  
  <div class="prize-pool">
    Total Prize Pool: ₹${totalPrizePool}
  </div>
  
  <h2>🎉 Winners</h2>
  <table>
    <thead>
      <tr>
        <th>Position</th>
        <th>Name</th>
        <th>Username</th>
        <th>Prize</th>
      </tr>
    </thead>
    <tbody>
      ${winners.map((winner) => `
        <tr class="position-${winner.position}">
          <td>#${winner.position}</td>
          <td>${winner.full_name || '-'}</td>
          <td>@${winner.username || '-'}</td>
          <td>₹${winner.amount}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>Powered by Vyuha Esport</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};