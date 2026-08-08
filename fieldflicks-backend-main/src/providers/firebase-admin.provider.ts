import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from 'src/constant/providers.constant';

export default {
  provide: FIREBASE_ADMIN,
  useFactory: () => {
    if (!admin.apps.length) {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    return admin.app();
  },
};
