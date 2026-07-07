// ponytail: console em dev; plugar Resend/SMTP aqui quando houver deploy.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}) {
  console.log(`\n[email] → ${opts.to}\n  ${opts.subject}\n  ${opts.text}\n`);
}
