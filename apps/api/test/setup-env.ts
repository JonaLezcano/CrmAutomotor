// Corre antes que se importe cualquier módulo del test (jest `setupFiles`),
// así PrismaService/PrismaSystemService leen las DATABASE_URL_* de la base
// de test (crm_automotor_test) y no las de dev por accidente.
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

if (!process.env.DATABASE_URL?.includes('crm_automotor_test')) {
  throw new Error('Los tests e2e deben correr contra crm_automotor_test — revisar apps/api/.env.test');
}
