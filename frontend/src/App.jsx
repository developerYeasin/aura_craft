import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.jsx';
import { StoreProvider } from './context/StoreContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import AdminLayout, { RequireRole } from './components/layout/AdminLayout.jsx';
import { Loader } from './components/ui/index.jsx';

import Home from './pages/Home.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import ProductDetails from './pages/ProductDetails.jsx';

const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess.jsx'));
const TrackOrder = lazy(() => import('./pages/TrackOrder.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const Upcoming = lazy(() => import('./pages/Upcoming.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const Login = lazy(() => import('./pages/admin/Login.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories.jsx'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'));
const AdminTeam = lazy(() => import('./pages/admin/AdminTeam.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));

const App = () => (
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <StoreProvider>
            <CartProvider>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="/products" element={<CatalogPage mode="all" />} />
                  <Route path="/category/:slug" element={<CatalogPage mode="category" />} />
                  <Route path="/product/:slug" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-success/:code" element={<OrderSuccess />} />
                  <Route path="/track" element={<TrackOrder />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/upcoming" element={<Upcoming />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                <Route path="/admin/login" element={<Login />} />
                {/* legacy entry point kept working, but it must land on the guarded route */}
                <Route path="/immortal" element={<Navigate to="/admin/users" replace />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="team" element={<AdminTeam />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route
                    path="users"
                    element={
                      <RequireRole roles={['immortal']}>
                        <AdminUsers />
                      </RequireRole>
                    }
                  />
                </Route>
              </Routes>
            </Suspense>
            </CartProvider>
          </StoreProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
