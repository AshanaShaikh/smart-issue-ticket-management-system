import { createContext, useContext, useState } from 'react';

// AuthContext holds the logged-in user and token.
// It will be populated when login/register pages are built.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Lazy initialisers read localStorage once at mount — no useEffect needed,
  // which avoids the react-hooks/set-state-in-effect ESLint rule.
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  //login function
  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", jwtToken);
  };

  //logout function
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — import this in any component that needs auth state.
// Usage: const { user, token, login, logout } = useAuth();
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
