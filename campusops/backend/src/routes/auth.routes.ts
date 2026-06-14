import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { generateOtpForUser } from '../bots/telegram.bot';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';
import { Response } from 'express';

const router = Router();

router.post('/login', authCtrl.loginValidation, authCtrl.login);
router.post('/refresh', authCtrl.refresh);
router.post('/logout', authCtrl.logout);
router.get('/profile', authenticate, authCtrl.getProfile);
router.post('/forgot-password', authCtrl.forgotPassword);
router.post('/reset-password', authCtrl.resetPasswordValidation, authCtrl.resetPassword);
router.put('/profile', authenticate, authCtrl.updateProfile);
router.post('/change-password', authenticate, authCtrl.changePassword);
router.post('/telegram-otp', authenticate, async (req: AuthRequest, res: Response) => {
  const otp = await generateOtpForUser(req.user!.userId);
  return sendSuccess(res, { otp }, 'Code OTP généré (valide 10 min)');
});

export default router;
