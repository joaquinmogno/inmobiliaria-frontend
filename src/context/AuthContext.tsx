import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService, type User } from '../services/auth.service';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateInmobiliaria: (nombre: string) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const handleLogoutEvent = () => {
            logout();
        };

        window.addEventListener('logout', handleLogoutEvent);

        const currentUser = authService.getCurrentUser();
        // authService.isAuthenticated() now checks the 8-hour limit
        if (currentUser && authService.isAuthenticated()) {
            setUser(currentUser);
            setIsAuthenticated(true);
        } else {
            // If not authenticated (e.g. expired), ensure state is cleared
            logout();
        }
        setLoading(false);

        return () => {
            window.removeEventListener('logout', handleLogoutEvent);
        };
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
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
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateInmobiliaria, loading }}>
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
