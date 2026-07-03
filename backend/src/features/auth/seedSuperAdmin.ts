import bcrypt from 'bcryptjs';
import { config } from '../../config';
import { UserModel } from '../../models/User';
import { createLogger } from '../../utils/logger';

const log = createLogger('super-admin-seed');
const SALT_ROUNDS = 12;

export async function seedSuperAdmin(): Promise<void> {
  const email = config.superAdmin.email?.trim().toLowerCase();
  const password = config.superAdmin.password;

  if (!email) return;
  if (!password) {
    log.warn('SUPER_ADMIN_EMAIL is set but SUPER_ADMIN_PASSWORD is missing');
    return;
  }

  const existing = await UserModel.findOne({ email }).select('+passwordHash').exec();

  if (existing) {
    let changed = false;

    if (existing.role !== 'super_admin') {
      existing.role = 'super_admin';
      changed = true;
    }

    if (existing.status !== 'active') {
      existing.status = 'active';
      changed = true;
    }

    if (!existing.emailVerifiedAt) {
      existing.emailVerifiedAt = new Date();
      changed = true;
    }

    if (changed) {
      await existing.save();
      log.info('promoted configured account to super_admin', { email });
    }

    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await UserModel.create({
    firstName: config.superAdmin.firstName,
    lastName: config.superAdmin.lastName,
    email,
    passwordHash,
    role: 'super_admin',
    status: 'active',
    emailVerifiedAt: new Date(),
    metadata: { seededBy: 'startup-super-admin-seed' },
  });

  log.info('created configured super_admin account', { email });
}
