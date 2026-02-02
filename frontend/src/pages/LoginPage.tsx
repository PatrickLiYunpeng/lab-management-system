import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Button, Input, useToast } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { getRoleHomePage } from '../utils/permissions';
import type { LoginRequest } from '../types';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const toast = useToast();

  // Redirect authenticated users to their role-appropriate home page
  useEffect(() => {
    if (isAuthenticated && user) {
      const homePage = getRoleHomePage(user.role);
      navigate(homePage, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const validate = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      newErrors.username = 'Please input your username';
    }
    if (!password) {
      newErrors.password = 'Please input your password';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const values: LoginRequest = { username, password };
      const response = await login(values);
      toast.success('登录成功');
      // Redirect to role-appropriate home page
      const homePage = getRoleHomePage(response.user.role);
      navigate(homePage);
    } catch {
      toast.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-700">
      <div className="w-96 bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">
            Lab Management System
          </h1>
          <p className="text-neutral-500">
            Sign in to your account
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Input
              prefix={<UserIcon className="w-5 h-5 text-neutral-400" />}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-error-500">{errors.username}</p>
            )}
          </div>

          <div className="mb-6">
            <Input
              type="password"
              prefix={<LockClosedIcon className="w-5 h-5 text-neutral-400" />}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-error-500">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full"
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
