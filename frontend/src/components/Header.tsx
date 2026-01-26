import React from 'react';
import { Button, Dropdown, Avatar } from 'antd';
import { UserOutlined, LogoutOutlined, LoginOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { removeAuthToken } from '../services/auth';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  isAuth: boolean;
}

const Header: React.FC<HeaderProps> = ({ isAuth }) => {
  const navigate = useNavigate();
  const { username, setIsAuth, setUsername: setContextUsername } = useAuth();

  const handleLogout = () => {
    removeAuthToken();
    setIsAuth(false);
    setContextUsername(null);
    navigate('/login');
  };

  const dropdownItems = [
    {
      key: 'username',
      label: (
        <div className="px-4 py-2.5 text-white font-medium">
          {username}
        </div>
      ),
      style: {
        backgroundColor: '#2a2c42',
        borderRadius: '8px 8px 0 0',
        margin: 0,
        padding: 0
      }
    },
    {
      key: 'profile',
      label: (
        <div onClick={() => navigate('/profile')} className="flex items-center space-x-2 px-4 py-2.5 text-[#8e8fb5] hover:text-white">
          <UserOutlined className="text-sm" />
          <span className="font-medium">Your Gallery</span>
        </div>
      ),
      style: {
        backgroundColor: '#242538',
        margin: 0,
        padding: 0
      },
      className: 'hover:bg-[#2a2c42] transition-colors duration-200'
    },
    {
      key: 'logout',
      label: (
        <div onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2.5 text-[#8e8fb5] hover:text-white">
          <LogoutOutlined className="text-sm" />
          <span className="font-medium">Sign Out</span>
        </div>
      ),
      style: {
        backgroundColor: '#242538',
        borderRadius: '0 0 8px 8px',
        margin: 0,
        padding: 0
      },
      className: 'hover:bg-[#2a2c42] transition-colors duration-200'
    },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#242538] border-b border-[#383a5c]">
      <Link to="/" className="text-xl font-semibold text-white hover:text-[#6366f1] transition-colors">
        Imagix AI
      </Link>
      <div className="flex items-center">
        {isAuth ? (
          <Dropdown 
            menu={{ 
              items: dropdownItems,
              className: "mt-1 rounded-lg overflow-hidden border border-[#383a5c]",
              style: { 
                padding: 0,
                backgroundColor: '#242538'
              }
            }} 
            placement="bottomRight"
            trigger={['click']}
          >
            <div className="cursor-pointer">
              <Avatar 
                icon={<UserOutlined />} 
                className="bg-[#6366f1] hover:bg-[#4f46e5] transition-colors w-10 h-10 flex items-center justify-center"
              />
            </div>
          </Dropdown>
        ) : (
          <Button
            type="primary"
            icon={<LoginOutlined />}
            className="flex items-center bg-[#6366f1] hover:bg-[#4f46e5] border-none h-10 px-6"
            onClick={() => navigate('/login')}
          >
            <span className="ml-2 font-medium">Sign In</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Header;
