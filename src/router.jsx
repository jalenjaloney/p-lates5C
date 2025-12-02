import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Signup from './components/Signup';
import Signin from './components/Signin';
import Dashboard from './components/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import DishDetail from './components/DishDetail';
import Profile from './components/Profile';
import VerifyEmail from './components/VerifyEmail';
import PeopleSearch from './components/PeopleSearch';
import UserProfile from './components/UserProfile';

export const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/signup', element: <Signup /> },
  { path: '/signin', element: <Signin /> },
  { path: '/verify', element: <VerifyEmail /> },
  {
    path: '/people',
    element: (
      <PrivateRoute>
        <PeopleSearch />
      </PrivateRoute>
    ),
  },
  {
    path: '/user/:handle',
    element: (
      <PrivateRoute>
        <UserProfile />
      </PrivateRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
  },
  { path: '/dish/:hallSlug/:dishSlug', element: <DishDetail /> },
  {
    path: '/profile',
    element: (
      <PrivateRoute>
        <Profile />
      </PrivateRoute>
    ),
  },
]);
