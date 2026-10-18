import React, { useState } from 'react';
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  PackageCheck,
  AlertCircle,
  Image as ImageIcon,
  DollarSign,
  ShieldCheck,
  LogOut,
  Menu,
} from 'lucide-react';
import logoSvg from '../assets/logo.svg';
import logoPng from '../assets/logo.png';

import { DataSourceMode } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  urgentCount?: number;
  mode?: DataSourceMode;
  onToggleMode?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onLogout,
  urgentCount = 0,
  mode = 'PRODUCTION',
  onToggleMode,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan & ESG', icon: LayoutDashboard },
    { id: 'merchants', label: 'Quản lý Đối tác', icon: Store },
    { id: 'bags', label: 'Surprising Bags', icon: PackageCheck },
    { id: 'orders', label: 'Đơn hàng & Pickup', icon: ShoppingBag },
    { id: 'issues', label: 'Khiếu nại & Sự cố', icon: AlertCircle, badge: urgentCount > 0 ? urgentCount : undefined },
    { id: 'banners', label: 'CMS Banners', icon: ImageIcon },
    { id: 'finance', label: 'Đối soát & Payouts', icon: DollarSign },
    { id: 'audit', label: 'Nhật ký & RBAC', icon: ShieldCheck },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        background: '#193B2C',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        boxShadow: '4px 0 24px rgba(25, 59, 44, 0.15)',
        transition: 'width 0.2s ease',
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: 'transparent',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={logoSvg}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== logoPng) {
                  target.src = logoPng;
                }
              }}
              alt="GoSavingFood Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)',
              }}
            />
          </div>
          {!collapsed && (
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                GoSavingFood
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  color: '#D8ED9B',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                Operations Portal
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#D8ED9B',
            borderRadius: '6px',
            width: '26px',
            height: '26px',
            display: collapsed ? 'none' : 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <Menu size={14} />
        </button>
      </div>

      {/* Nav Menu */}
      <nav
        style={{
          flex: 1,
          padding: '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          overflowY: 'auto',
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? '#166B4A' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <Icon size={18} color={isActive ? '#D8ED9B' : 'rgba(255,255,255,0.7)'} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span
                  style={{
                    background: '#DC2626',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '1px 6px',
                    borderRadius: '999px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer User Info */}
      <div
        style={{
          padding: '14px 10px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Data Source Mode Switcher */}
        <div
          style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '10px',
            padding: collapsed ? '6px' : '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
            {!collapsed && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                Nguồn Dữ Liệu
              </span>
            )}
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '6px',
                background: mode === 'PRODUCTION' ? '#166B4A' : '#F4C95D',
                color: mode === 'PRODUCTION' ? '#D8ED9B' : '#193B2C',
              }}
            >
              {collapsed ? (mode === 'PRODUCTION' ? 'PROD' : 'DEMO') : mode}
            </span>
          </div>

          {!collapsed && onToggleMode && (
            <button
              onClick={onToggleMode}
              style={{
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {mode === 'PRODUCTION' ? 'Bật Chế Độ Demo' : 'Dùng Live Database'}
            </button>
          )}
        </div>

        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#D8ED9B',
                color: '#193B2C',
                fontWeight: '800',
                fontSize: '11px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              AD
            </div>
            <div style={{ fontSize: '11.5px', overflow: 'hidden' }}>
              <div style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>SuperAdmin</div>
              <div style={{ color: '#D8ED9B', fontSize: '10px', whiteSpace: 'nowrap' }}>Platform Operations</div>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          title={collapsed ? 'Đăng xuất' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(220, 38, 38, 0.15)',
            color: '#fca5a5',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};
