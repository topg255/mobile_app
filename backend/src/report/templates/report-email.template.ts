import { ReportKPIs } from '../ai-report.service';

export function buildReportEmailHtml(params: {
  superviseurName: string;
  dateFormatted: string;
  kpis: ReportKPIs;
  aiAnalysis: string;
  recommendations: string;
  summary: string;
}): string {
  const { superviseurName, dateFormatted, kpis, aiAnalysis, recommendations, summary } = params;

  const statusColor =
    kpis.rougePercent > 30 ? '#dc2626' :
    kpis.rougePercent > 15 ? '#f59e0b' :
    kpis.vertPercent >= 80 ? '#16a34a' : '#2563eb';

  const statusLabel =
    kpis.rougePercent > 30 ? 'Critique' :
    kpis.rougePercent > 15 ? 'Attention' :
    kpis.vertPercent >= 80 ? 'Excellent' : 'A ameliorer';

  const markdownToHtml = (text: string): string => {
    return text
      .split('\n\n')
      .map((para) => {
        let html = para
          .replace(/\n/g, '<br>')
          .replace(/\[OK\]/g, '<span style="color:#16a34a;font-weight:700">[OK]</span>')
          .replace(/\[URGENT\]/g, '<span style="color:#dc2626;font-weight:700">[URGENT]</span>')
          .replace(/• /g, '&bull; ');
        return `<p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#334155">${html}</p>`;
      })
      .join('');
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 40px;text-align:center">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">
                Rapport Qualite Quotidien
              </h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:13px">${dateFormatted}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 40px 0">
              <p style="margin:0;font-size:15px;color:#475569">
                Bonjour <strong style="color:#1e293b">${superviseurName}</strong>,
              </p>
              <p style="margin:10px 0 0;font-size:14px;color:#64748b;line-height:1.6">
                Voici votre rapport qualite genere automatiquement par l'intelligence artificielle.
              </p>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="padding:24px 40px 0">
              <div style="background:${statusColor}08;border:1px solid ${statusColor}20;border-radius:12px;padding:16px 20px;text-align:center">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:${statusColor};font-weight:700;margin-bottom:4px">
                  Statut global
                </div>
                <div style="font-size:20px;font-weight:800;color:${statusColor}">
                  ${statusLabel}
                </div>
              </div>
            </td>
          </tr>

          <!-- KPI Cards -->
          <tr>
            <td style="padding:24px 40px 0">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="25%" style="padding:0 4px">
                    <div style="background:#f0fdf4;border-radius:10px;padding:16px 12px;text-align:center">
                      <div style="font-size:22px;font-weight:800;color:#16a34a">${kpis.vertCount}</div>
                      <div style="font-size:10px;color:#16a34a;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px;font-weight:600">Conformes</div>
                      <div style="font-size:11px;color:#86efac;margin-top:2px">${kpis.vertPercent}%</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 4px">
                    <div style="background:#fefce8;border-radius:10px;padding:16px 12px;text-align:center">
                      <div style="font-size:22px;font-weight:800;color:#ca8a04">${kpis.jauneCount}</div>
                      <div style="font-size:10px;color:#ca8a04;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px;font-weight:600">A surveiller</div>
                      <div style="font-size:11px;color:#fde047;margin-top:2px">${kpis.jaunePercent}%</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 4px">
                    <div style="background:#fef2f2;border-radius:10px;padding:16px 12px;text-align:center">
                      <div style="font-size:22px;font-weight:800;color:#dc2626">${kpis.rougeCount}</div>
                      <div style="font-size:10px;color:#dc2626;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px;font-weight:600">Critiques</div>
                      <div style="font-size:11px;color:#fca5a5;margin-top:2px">${kpis.rougePercent}%</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 4px">
                    <div style="background:#eff6ff;border-radius:10px;padding:16px 12px;text-align:center">
                      <div style="font-size:22px;font-weight:800;color:#2563eb">${kpis.totalMinutes}</div>
                      <div style="font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px;font-weight:600">Minutes arret</div>
                      <div style="font-size:11px;color:#93c5fd;margin-top:2px">${kpis.totalLignes} lignes</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding:24px 40px 0">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px">
                <p style="margin:0;font-size:13px;color:#475569;line-height:1.6">${summary}</p>
              </div>
            </td>
          </tr>

          <!-- AI Analysis -->
          <tr>
            <td style="padding:24px 40px 0">
              <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;font-weight:700">
                Analyse IA
              </h2>
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px">
                ${markdownToHtml(aiAnalysis)}
              </div>
            </td>
          </tr>

          <!-- Recommendations -->
          <tr>
            <td style="padding:24px 40px 0">
              <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;font-weight:700">
                Recommandations
              </h2>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px">
                ${markdownToHtml(recommendations)}
              </div>
            </td>
          </tr>

          <!-- Agent Activity -->
          ${kpis.topAgent !== 'Aucun' ? `
          <tr>
            <td style="padding:24px 40px 0">
              <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;font-weight:700">
                Top Agent
              </h2>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;text-align:center">
                <div style="font-size:18px;font-weight:700;color:#15803d">${kpis.topAgent}</div>
                <div style="font-size:12px;color:#4ade80;margin-top:4px">Agent le plus actif du jour</div>
              </div>
            </td>
          </tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px">
              <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center">
                <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">
                  Ce rapport a ete genere automatiquement par le Systeme de Management Qualite LEONI<br>
                  Intelligence Artificielle -- Analyse automatique des KPI<br>
                  ${dateFormatted}
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
