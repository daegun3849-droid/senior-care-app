/**
 * 메인 대시보드 상단 헤더
 * 서비스 로고, 알림/설정 아이콘, 프로필 드롭다운(이름·이메일·로그아웃)
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Settings, LogOut, Loader2 } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  onLogout?: () => Promise<void>;
}

export const Header = ({ userName = '', userEmail = '', onLogout }: HeaderProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  /**
   * 로그아웃 핸들러
   */
  const handleLogoutClick = async () => {
    if (!onLogout) return;
    try {
      setIsLoggingOut(true);
      setLogoutError(null);
      await onLogout();
    } catch {
      setLogoutError('로그아웃에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const initials = (userName || userEmail).charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* 서비스 로고/이름 */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <span className="font-bold text-lg">AI Todo Manager</span>
        </Link>

        {/* 우측: 알림·설정 아이콘 + 프로필 드롭다운 */}
        <div className="flex items-center gap-1">
          {logoutError && (
            <span className="text-xs text-red-500 mr-2">{logoutError}</span>
          )}

          <Button variant="ghost" size="icon" aria-label="알림">
            <Bell className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" aria-label="설정">
            <Settings className="h-5 w-5" />
          </Button>

          {/* 프로필 아바타 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="ml-1 w-9 h-9 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="프로필 메뉴"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  {userName && (
                    <span className="font-semibold text-sm">{userName}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
