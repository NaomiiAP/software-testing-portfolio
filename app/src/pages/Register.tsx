import { Check, UserPlus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { SuccessCheck } from '../components/art';
import { LENS } from '../components/demo/lens';
import { useToast } from '../components/toast';
import { Alert, Field, ctaButton, inputClass } from '../components/ui';
import {
  MESSAGES,
  validateEmail,
  validateMobile,
  validateName,
  validatePassword,
  validateUsername,
} from '../lib/validation';
import { useAuth } from '../store/AuthContext';
import { db } from '../store/db';

type Form = { fullName: string; username: string; email: string; mobile: string; password: string; confirm: string };
const FIELDS: { key: keyof Form; label: string; type?: string; placeholder?: string }[] = [
  { key: 'fullName', label: 'Full name', placeholder: 'As on ID proof' },
  { key: 'username', label: 'Username', placeholder: '4-15 letters, digits or _' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
  { key: 'mobile', label: 'Mobile number', placeholder: '10 digits' },
  { key: 'password', label: 'Password', type: 'password' },
  { key: 'confirm', label: 'Confirm password', type: 'password' },
];

const RULES = [
  { label: '8-20 characters', test: (p: string) => p.length >= 8 && p.length <= 20 },
  { label: 'Upper-case letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lower-case letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Digit', test: (p: string) => /\d/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState<Form>({ fullName: '', username: '', email: '', mobile: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [done, setDone] = useState(false);

  const passed = RULES.filter((r) => r.test(form.password)).length;
  const strength = ['bg-line', 'bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-amber-500', 'bg-mint-500'][passed];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    const check = (k: keyof Form, msg: string | null) => { if (msg) errs[k] = msg; };
    check('fullName', validateName(form.fullName));
    check('username', validateUsername(form.username) ?? (db.findUser(form.username) ? 'Username is already taken' : null));
    check('email', validateEmail(form.email));
    check('mobile', validateMobile(form.mobile));
    check('password', validatePassword(form.password));
    check('confirm', form.confirm !== form.password ? MESSAGES.passwordMismatch : null);
    setErrors(errs);
    const n = Object.keys(errs).length;
    if (n > 0) {
      toast.error(`${n} field${n > 1 ? 's need' : ' needs'} attention`, Object.values(errs)[0], LENS.register);
      return;
    }
    register({ fullName: form.fullName.trim(), username: form.username, email: form.email.trim(), mobile: form.mobile.trim(), password: form.password });
    toast.success('Account created', `Welcome aboard, ${form.fullName.trim()}! You can log in now.`);
    setDone(true);
  };

  if (done) {
    const next = params.get('next');
    return (
      <AuthLayout title="You're all set" subtitle="Your RailReserve account is ready.">
        <div className="grid place-items-center py-4"><SuccessCheck size={84} /></div>
        <Alert kind="success" testId="reg-success">
          Account <b>{form.username}</b> created.{' '}
          <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link" data-testid="reg-login-link">Log in now</Link>
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Register once and book trains in seconds.">
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, type, placeholder }) => (
          <Field key={key} label={label} htmlFor={`reg-${key}`} error={errors[key]} errorTestId={`reg-error-${key}`}>
            <input
              id={`reg-${key}`}
              type={type ?? 'text'}
              value={form[key]}
              placeholder={placeholder}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className={inputClass}
              aria-invalid={!!errors[key]}
              data-testid={`reg-${key}`}
            />
          </Field>
        ))}
        <div className="sm:col-span-2">
          <div className="flex gap-1.5" aria-hidden="true">
            {RULES.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < passed ? strength : 'bg-line'}`} />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3" data-testid="password-rules">
            {RULES.map((r) => {
              const met = r.test(form.password);
              return (
                <li key={r.label} className={`flex items-center gap-1.5 font-medium transition-colors ${met ? 'text-mint-700' : 'text-muted'}`}>
                  {met ? <Check size={13} strokeWidth={3} /> : <X size={13} />} {r.label}
                </li>
              );
            })}
          </ul>
          <button type="submit" className={`${ctaButton} mt-5 w-full py-3.5 text-base`} data-testid="reg-submit">
            <UserPlus size={18} /> Create account
          </button>
          <p className="mt-4 text-sm text-muted">Already registered? <Link to="/login" className="link">Log in</Link></p>
        </div>
      </form>
    </AuthLayout>
  );
}
