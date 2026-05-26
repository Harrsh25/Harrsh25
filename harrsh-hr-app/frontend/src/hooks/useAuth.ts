import useAuthStore from '../store/authStore';

const useAuth = () => {
  const { user, accessToken, isAuthenticated, login, logout, updateUser } = useAuthStore();
  return { user, accessToken, isAuthenticated, login, logout, updateUser };
};

export default useAuth;
