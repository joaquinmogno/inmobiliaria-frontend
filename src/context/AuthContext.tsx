import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService, type User } from '../services/auth.service';
import { toast } from 'react-hot-toast';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<User | null>;
    updateInmobiliaria: (nombre: string) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    const refreshUser = useCallback(async () => {
        if (!authService.isAuthenticated()) return null;

        try {
            const freshUser = await authService.me();
            setUser(freshUser);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(freshUser));
            return freshUser;
        } catch (error) {
            logout();
            return null;
        }
    }, [logout]);

    useEffect(() => {
        const handleLogoutEvent = () => {
            logout();
        };

        const handlePermissionDenied = (event: Event) => {
            const detail = event instanceof CustomEvent ? event.detail : null;
            toast.error(detail || 'No tenés permiso para realizar esta acción');
        };

        const handleFocus = () => {
            refreshUser();
        };

        window.addEventListener('logout', handleLogoutEvent);
        window.addEventListener('permission-denied', handlePermissionDenied);
        window.addEventListener('focus', handleFocus);

        const currentUser = authService.getCurrentUser();
        // authService.isAuthenticated() now checks the 8-hour limit
        if (currentUser && authService.isAuthenticated()) {
            setUser(currentUser);
            setIsAuthenticated(true);
            refreshUser().finally(() => setLoading(false));
        } else {
            // If not authenticated (e.g. expired), ensure state is cleared
            logout();
            setLoading(false);
        }

        return () => {
            window.removeEventListener('logout', handleLogoutEvent);
            window.removeEventListener('permission-denied', handlePermissionDenied);
            window.removeEventListener('focus', handleFocus);
        };
    }, [logout, refreshUser]);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
    };

    const updateInmobiliaria = (nombre: string) => {
        if (!user) return;
        const updatedUser = {
            ...user,
            inmobiliaria: { ...user.inmobiliaria, nombre }
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, refreshUser, updateInmobiliaria, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
