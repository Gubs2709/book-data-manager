'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { BookOpenCheck, LogOut, User as UserIcon, LogIn } from "lucide-react";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import Link from 'next/link';

export default function Header() {
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogout = () => {
    if (!auth) return;
    signOut(auth);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <BookOpenCheck className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">
              EduBook Calculator
            </span>
          </a>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
            {isUserLoading ? (
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      {user.photoURL ? <AvatarImage src={user.photoURL} alt="User Avatar" /> : (userAvatar && <AvatarImage src={userAvatar.imageUrl} data-ai-hint={userAvatar.imageHint} alt="User Avatar" />) }
                      <AvatarFallback>{user.isAnonymous ? 'A' : (user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U')}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
               <Button asChild>
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
              </Button>
            )}
        </div>
      </div>
    </header>
  );
}
