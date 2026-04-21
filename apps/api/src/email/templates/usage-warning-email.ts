export function usageWarningEmailTemplate(args: {
  userName: string;
  userEmail: string;
  organizationName: string;
  maxPercent: number;
  upgradeUrl: string;
}): string {
  const { userName, userEmail, organizationName, maxPercent, upgradeUrl } = args;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Você usou ${maxPercent}% do seu limite — nexvideo</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .content {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: 700;
          color: #000;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
        }
        h1 {
          color: #d97706;
          font-size: 22px;
          margin: 20px 0;
          text-align: center;
        }
        p {
          color: #555;
          font-size: 16px;
          margin: 15px 0;
        }
        .usage-box {
          background-color: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .usage-percent {
          font-size: 40px;
          font-weight: 700;
          color: #d97706;
        }
        .usage-label {
          font-size: 14px;
          color: #92400e;
          margin-top: 4px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 32px;
          background-color: #7c3aed;
          color: #fff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
        }
        .footer {
          border-top: 1px solid #eee;
          margin-top: 30px;
          padding-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <div class="header">
            <div class="logo">nexvideo</div>
            <p class="subtitle">Plataforma de Produção de Conteúdo com IA</p>
          </div>

          <h1>⚡ Você está próximo do seu limite</h1>

          <p>Olá, ${userName}!</p>

          <p>A organização <strong>${organizationName}</strong> atingiu <strong>${maxPercent}%</strong> do limite mensal de uso. Se continuar no ritmo atual, você pode não conseguir criar mais conteúdo este mês.</p>

          <div class="usage-box">
            <div class="usage-percent">${maxPercent}%</div>
            <div class="usage-label">do limite mensal utilizado</div>
          </div>

          <p>Faça upgrade agora para continuar produzindo sem interrupções:</p>

          <div class="button-container">
            <a href="${upgradeUrl}" class="button">Ver planos disponíveis</a>
          </div>

          <p style="font-size: 14px; color: #888;">Se você já fez upgrade ou não precisa de mais capacidade este mês, pode ignorar este e-mail. Seu limite será reiniciado no início do próximo mês.</p>

          <div class="footer">
            <p>© 2026 nexvideo. Todos os direitos reservados.</p>
            <p>Enviado para: <strong>${userEmail}</strong></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
