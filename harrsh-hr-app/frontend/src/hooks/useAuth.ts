import useAuthStore from '../store/authStore.js';

const useAuth = () => {
  const { user, accessToken, isAuthenticated, login, logout, updateUser } = useAuthStore();
  return { user, accessToken, isAuthenticated, login, logout, updateUser };
};

export default useAuth;
