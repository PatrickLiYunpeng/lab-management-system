import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { getRoleHomePage } from '../utils/permissions';
import type { LoginRequest } from '../types';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const { message } = App.useApp();

  // Redirect authenticated users to their role-appropriate home page
  useEffect(() => {
    if (isAuthenticated && user) {
      const homePage = getRoleHomePage(user.role);
      navigate(homePage, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const response = await login(values);
      message.success('登录成功');
      // Redirect to role-appropriate home page
      const homePage = getRoleHomePage(response.user.role);
      navigate(homePage);
    } catch {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#262626', marginBottom: 8 }}>
            Lab Management System
          </h1>
          <p style={{ color: '#8c8c8c' }}>
            Sign in to your account
          </p>
        </div>
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Username"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
