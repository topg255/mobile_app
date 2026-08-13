/**
 * Génération de la PKI de signature LEONI Qualité IA
 * - Paire RSA 2048 bits
 * - Certificat X.509 auto-signé (CA) valide 2 ans
 * Résultat : backend/keys/{private.pem, certificate.pem, ca.pem}
 */
import * as forge from 'node-forge';
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'keys');

function ensureDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function certThumbprintSha256(cert: forge.pki.Certificate): string {
  const der = forge.asn1.toDer(
    forge.pki.certificateToAsn1(cert),
  ).getBytes();
  const md = forge.md.sha256.create();
  md.update(der);
  return md.digest().toHex();
}

function formatThumbprint(hex: string): string {
  return hex
    .match(/.{1,2}/g)!
    .join(':')
    .toUpperCase();
}

async function main() {
  console.log('=== Génération PKI LEONI Qualité IA ===');
  ensureDir();

  console.log('1. Génération de la paire RSA 2048 bits...');
  const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });

  console.log('2. Construction du certificat X.509 auto-signé (2 ans)...');
  const cert = forge.pki.createCertificate();
  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(15));

  const attrs = [
    { name: 'commonName', value: 'LEONI Qualite IA' },
    { name: 'organizationName', value: 'LEONI' },
    { name: 'countryName', value: 'TN' },
    { name: 'emailAddress', value: 'qualite@leoni.com' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  const notBefore = new Date();
  notBefore.setDate(notBefore.getDate() - 1);
  const notAfter = new Date();
  notAfter.setFullYear(notAfter.getFullYear() + 2);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true,
      keyCertSign: true,
      crlSign: true,
    },
    { name: 'subjectKeyIdentifier' },
    {
      name: 'subjectAltName',
      altNames: [{ type: 1, value: 'qualite@leoni.com' }],
    },
  ]);

  cert.sign(keyPair.privateKey, forge.md.sha256.create());

  console.log('3. Sauvegarde des fichiers PEM (PKCS#8)...');
  const rsaAsn1 = forge.pki.privateKeyToAsn1(keyPair.privateKey);
  const privateKeyInfo = forge.pki.wrapRsaPrivateKey(rsaAsn1);
  const privatePem = forge.pki.privateKeyInfoToPem(privateKeyInfo);
  const certificatePem = forge.pki.certificateToPem(cert);

  fs.writeFileSync(path.join(OUT_DIR, 'private.pem'), privatePem, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'certificate.pem'), certificatePem, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'ca.pem'), certificatePem, 'utf8');

  const thumbprint = formatThumbprint(certThumbprintSha256(cert));
  console.log('');
  console.log('=== Résumé ===');
  console.log(`private.pem       -> ${path.join(OUT_DIR, 'private.pem')}`);
  console.log(`certificate.pem   -> ${path.join(OUT_DIR, 'certificate.pem')}`);
  console.log(`ca.pem            -> ${path.join(OUT_DIR, 'ca.pem')}`);
  console.log(`Thumbprint SHA-256: ${thumbprint}`);
  console.log(`Valide du ${notBefore.toISOString().split('T')[0]} au ${notAfter.toISOString().split('T')[0]}`);
  console.log('=== Terminé ===');
}

main().catch((err) => {
  console.error('Erreur de génération PKI:', err);
  process.exit(1);
});