import React, { useState, useEffect } from 'react';
import { ChefHat, Package, Utensils, DollarSign, AlertTriangle, CheckCircle2, Clock, Plus, Trash2, AlertCircle, Edit3, Image as ImageIcon, X, Sparkles, Ban, Eye, EyeOff, Tag, RefreshCw } from 'lucide-react';
import { KitchenLoadingScreen, KitchenDataLoader, KitchenSkeletonRows } from '../components/KitchenLoading';

const presetImages = [
  { label: 'Pasta', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80' },
  { label: 'Ravioli', url: 'https://images.unsplash.com/photo-1587740896339-96a761e0508d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Gnocchi', url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281313?auto=format&fit=crop&w=600&q=80' },
  { label: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },
  { label: 'Curry', url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80' },
  { label: 'Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80' },
  { label: 'Ramen', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
  { label: 'Tiramisu', url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80' }
];

export default function ChefSite({ user, onLogin, onLogout }) {
  const [loginEmail, setLoginEmail] = useState('chef.mario@chefhub.com');
  const [loginPassword, setLoginPassword] = useState('vendor123');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('dishes');
  const [orders, setOrders] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [payouts, setPayouts] = useState(() => {
    try {
      const cached = localStorage.getItem('chefhub_vendor_payouts');
      return cached ? JSON.parse(cached) : { total_earned: '0.00', payouts: [] };
    } catch {
      return { total_earned: '0.00', payouts: [] };
    }
  });
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [chefReviews, setChefReviews] = useState([]);

  // Add Dish Form
  const [newDish, setNewDish] = useState({ name: '', category: 'Pasta', base_price: '', daily_stock: '20', description: '', image_url: '', is_available: true });
  
  // Edit Dish Modal State
  const [editingDish, setEditingDish] = useState(null);
  const [editForm, setEditForm] = useState({ dish_id: '', name: '', category: '', base_price: '', daily_stock: '20', description: '', image_url: '', is_available: true });

  // Add Ingredient Form & Edit State
  const [newIngredient, setNewIngredient] = useState({ ingredient_name: '', stock_quantity: '', unit: 'kg', reorder_level: '10' });
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [editIngredientForm, setEditIngredientForm] = useState({ ingredient_id: '', ingredient_name: '', stock_quantity: '', unit: '', reorder_level: '' });

  // Add Recipe Form & Edit State
  const [newRecipe, setNewRecipe] = useState({ dish_id: '', ingredient_id: '', quantity_required: '' });
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editRecipeForm, setEditRecipeForm] = useState({ recipe_id: '', dish_name: '', ingredient_name: '', quantity_required: '', unit: '' });

  const [storeProfile, setStoreProfile] = useState({
    is_open: true,
    closed_reason: '',
    operating_hours: '11:00 AM - 10:00 PM',
    open_time: '11:00',
    close_time: '22:00',
    chef_bio: ''
  });
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showCloseReasonModal, setShowCloseReasonModal] = useState(false);
  const [selectedPresetReason, setSelectedPresetReason] = useState('Chef has manually closed the kitchen for today (Offline).');
  const [customReasonInput, setCustomReasonInput] = useState('');
  const [autoReopenedNotice, setAutoReopenedNotice] = useState(false);

  const [hoursForm, setHoursForm] = useState({
    operating_hours: '11:00 AM - 10:00 PM',
    open_time: '11:00',
    close_time: '22:00',
    chef_bio: ''
  });

  useEffect(() => {
    if (user && user.role === 'VENDOR') {
      fetchData().finally(() => setLoadingInitial(false));
      fetchPayouts(false);

      // Real-Time Event Stream for Kitchen Display System (KDS)
      let eventSource = null;
      try {
        const token = localStorage.getItem('chefhub_token');
        const channel = `vendor_${user.user_id}`;
        const url = token ? `/api/realtime/events?channel=${channel}&token=${encodeURIComponent(token)}` : `/api/realtime/events?channel=${channel}`;
        eventSource = new EventSource(url);

        eventSource.addEventListener('ORDER_CREATED', () => {
          fetchData();
        });

        eventSource.addEventListener('ORDER_STATUS_CHANGED', () => {
          fetchData();
        });

        eventSource.addEventListener('DISH_STOCK_UPDATED', () => {
          fetchData();
        });
      } catch (e) {
        // Fallback to background interval
      }

      const interval = setInterval(() => {
        fetchData();
      }, 15000);

      return () => {
        if (eventSource) eventSource.close();
        clearInterval(interval);
      };
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'VENDOR') {
      if (activeTab === 'payouts') {
        fetchPayouts(payouts.payouts?.length === 0);
      } else if (activeTab === 'recipes') {
        fetchRecipes();
      } else if (activeTab === 'reviews') {
        fetchReviews();
      }
    }
  }, [activeTab]);

  const fetchPayouts = async (forceSpinner = false) => {
    const token = localStorage.getItem('chefhub_token');
    if (!token) return;
    if (forceSpinner) setLoadingPayouts(true);
    try {
      const res = await fetch('/api/vendor/payouts', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setPayouts(data);
        localStorage.setItem('chefhub_vendor_payouts', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Chef fetchPayouts error:', err);
    } finally {
      setLoadingPayouts(false);
    }
  };

  const fetchRecipes = async () => {
    const token = localStorage.getItem('chefhub_token');
    if (!token) return;
    try {
      const res = await fetch('/api/vendor/recipes', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setRecipes(data.recipes);
    } catch (err) {
      console.error('Chef fetchRecipes error:', err);
    }
  };

  const fetchReviews = async () => {
    const token = localStorage.getItem('chefhub_token');
    if (!token) return;
    try {
      const res = await fetch('/api/vendor/reviews', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setChefReviews(data.reviews);
    } catch (err) {
      console.error('Chef fetchReviews error:', err);
    }
  };

  const fetchData = async () => {
    const token = localStorage.getItem('chefhub_token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Parallel fetch store profile, dishes, orders, and inventory so portion & ingredient stock updates in real-time
      const [resProf, resDishes, resOrders, resInv] = await Promise.all([
        fetch('/api/vendor/profile', { headers }),
        fetch('/api/vendor/dishes', { headers }),
        fetch('/api/vendor/orders', { headers }),
        fetch('/api/vendor/inventory', { headers })
      ]);

      const dataProf = await resProf.json();
      if (dataProf.success && dataProf.profile) {
        setStoreProfile(dataProf.profile);
        if (dataProf.profile.auto_reopened) {
          setAutoReopenedNotice(true);
        }
        setHoursForm({
          operating_hours: dataProf.profile.operating_hours || '11:00 AM - 10:00 PM',
          open_time: dataProf.profile.open_time || '11:00',
          close_time: dataProf.profile.close_time || '22:00',
          chef_bio: dataProf.profile.chef_bio || ''
        });
      }

      const dataDishes = await resDishes.json();
      if (dataDishes.success) {
        setDishes(dataDishes.dishes);
        if (dataDishes.dishes.length > 0 && !newRecipe.dish_id) {
          setNewRecipe(prev => ({ ...prev, dish_id: dataDishes.dishes[0].dish_id }));
        }
      }

      const dataOrders = await resOrders.json();
      if (dataOrders.success) setOrders(dataOrders.orders);

      const dataInv = await resInv.json();
      if (dataInv.success) {
        setInventory(dataInv.inventory);
        if (dataInv.inventory.length > 0 && !newRecipe.ingredient_id) {
          setNewRecipe(prev => ({ ...prev, ingredient_id: dataInv.inventory[0].ingredient_id }));
        }
      }
    } catch (err) {
      console.error('Chef fetchData error:', err);
    }
  };

  const handleInitiateKitchenToggle = () => {
    if (storeProfile.is_open) {
      setShowCloseReasonModal(true);
    } else {
      executeToggleStatus(true, null);
    }
  };

  const handleConfirmCloseKitchen = (e) => {
    e.preventDefault();
    const finalReason = selectedPresetReason === 'CUSTOM'
      ? (customReasonInput.trim() || 'Chef has manually closed the kitchen for today (Offline).')
      : selectedPresetReason;
    setShowCloseReasonModal(false);
    executeToggleStatus(false, finalReason);
  };

  // Instant 0ms Optimistic Kitchen Status Toggle
  const executeToggleStatus = async (targetIsOpen, closedReason) => {
    const prevProfile = { ...storeProfile };
    // 1. Instant zero-latency optimistic UI update
    setStoreProfile(prev => ({
      ...prev,
      is_open: targetIsOpen,
      closed_reason: targetIsOpen ? null : (closedReason || 'Chef has manually closed the kitchen for today (Offline).')
    }));

    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/vendor/toggle-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_open: targetIsOpen, closed_reason: closedReason })
      });
      const data = await res.json();
      if (data.success) {
        setStoreProfile(data.profile || { is_open: data.is_open, closed_reason: data.closed_reason });
      } else {
        setStoreProfile(prevProfile);
        alert(data.message || 'Failed to update kitchen status.');
      }
    } catch (err) {
      setStoreProfile(prevProfile);
      alert('Failed to update kitchen status.');
    }
  };

  const handleSaveHours = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/vendor/hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(hoursForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowHoursModal(false);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to save store timings.');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user, data.token);
      } else {
        setLoginError(data.message);
      }
    } catch (err) {
      setLoginError('Connection error. Is backend server running?');
    }
  };

  // Dish CRUD: Add, Toggle Stock, Edit, Delete
  const handleAddDish = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/vendor/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newDish)
      });
      const data = await res.json();
      if (data.success) {
        setNewDish({ name: '', category: 'Pasta', base_price: '', daily_stock: '20', description: '', image_url: '', is_available: true });
        fetchData();
      }
    } catch (err) {
      alert('Failed to add dish.');
    }
  };

  const handleToggleStock = async (dish_id) => {
    // 1. Instant zero-latency optimistic UI update
    const previousDishes = [...dishes];
    setDishes(prevDishes => prevDishes.map(d => {
      if (d.dish_id === dish_id) {
        const nextAvail = (d.is_available === 1 || d.is_available === true) ? 0 : 1;
        const nextStock = (nextAvail === 1 && (!d.daily_stock || Number(d.daily_stock) <= 0)) ? 20 : d.daily_stock;
        const nextReason = nextAvail === 1 ? 'In Stock' : 'Kitchen prep closed for today';
        return {
          ...d,
          is_available: nextAvail,
          daily_stock: nextStock,
          out_of_stock_reason: nextReason
        };
      }
      return d;
    }));

    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/dishes/${dish_id}/toggle-stock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Sync dish with confirmed server values smoothly
        setDishes(prevDishes => prevDishes.map(d => {
          if (d.dish_id === dish_id) {
            return {
              ...d,
              is_available: data.is_available ? 1 : 0,
              daily_stock: data.daily_stock !== undefined ? data.daily_stock : d.daily_stock,
              out_of_stock_reason: data.out_of_stock_reason || d.out_of_stock_reason
            };
          }
          return d;
        }));
      } else {
        // Revert on server error
        setDishes(previousDishes);
        alert(data.message || 'Failed to toggle stock status.');
      }
    } catch (err) {
      setDishes(previousDishes);
      alert('Failed to toggle stock status.');
    }
  };

  const handleAdjustStock = async (dish_id, delta) => {
    // Optimistic update for 0-latency feedback
    const previousDishes = [...dishes];
    setDishes((prev) =>
      prev.map((d) => {
        if (d.dish_id === dish_id) {
          const cur = Number(d.daily_stock !== undefined && d.daily_stock !== null ? d.daily_stock : 20);
          const nextStock = Math.max(0, cur + delta);
          return {
            ...d,
            daily_stock: nextStock,
            is_available: nextStock > 0 ? 1 : 0,
            out_of_stock_reason: nextStock === 0 ? 'Daily portions fully exhausted (0 remaining)' : (d.out_of_stock_reason === 'Daily portions fully exhausted (0 remaining)' ? 'In Stock' : d.out_of_stock_reason)
          };
        }
        return d;
      })
    );

    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/dishes/${dish_id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ delta })
      });
      const data = await res.json();
      if (data.success) {
        setDishes((prev) =>
          prev.map((d) =>
            d.dish_id === dish_id
              ? {
                  ...d,
                  daily_stock: data.daily_stock,
                  is_available: data.is_available ? 1 : 0,
                  out_of_stock_reason: data.out_of_stock_reason
                }
              : d
          )
        );
      } else {
        setDishes(previousDishes);
        alert(data.message || 'Failed to adjust stock');
      }
    } catch (err) {
      setDishes(previousDishes);
      console.error('Adjust stock error:', err);
    }
  };

  const openEditModal = (dish) => {
    setEditingDish(dish);
    setEditForm({
      dish_id: dish.dish_id,
      name: dish.name || '',
      category: dish.category || 'Pasta',
      base_price: dish.base_price || '',
      daily_stock: dish.daily_stock !== undefined ? dish.daily_stock : 20,
      description: dish.description || '',
      image_url: dish.image_url || '',
      is_available: dish.is_available !== 0 && dish.is_available !== false,
      out_of_stock_reason: dish.out_of_stock_reason || 'Daily portions fully exhausted (0 remaining)'
    });
  };

  const handleSaveEditDish = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/dishes/${editForm.dish_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setEditingDish(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to update dish.');
    }
  };

  const handleDeleteDish = async (dish_id) => {
    if (!confirm('Are you sure you want to delete this dish?')) return;
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/dishes/${dish_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Failed to delete dish.');
    }
  };

  // Inventory CRUD: Add, Edit & Delete
  const handleAddIngredient = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/vendor/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newIngredient)
      });
      const data = await res.json();
      if (data.success) {
        setNewIngredient({ ingredient_name: '', stock_quantity: '', unit: 'kg', reorder_level: '10' });
        fetchData();
      }
    } catch (err) {
      alert('Failed to update inventory.');
    }
  };

  const openEditIngredientModal = (inv) => {
    setEditingIngredient(inv);
    setEditIngredientForm({
      ingredient_id: inv.ingredient_id,
      ingredient_name: inv.ingredient_name,
      stock_quantity: inv.stock_quantity,
      unit: inv.unit,
      reorder_level: inv.reorder_level
    });
  };

  const handleSaveEditIngredient = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/inventory/${editIngredientForm.ingredient_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editIngredientForm)
      });
      const data = await res.json();
      if (data.success) {
        setEditingIngredient(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to update ingredient.');
    }
  };

  const handleDeleteIngredient = async (ingredient_id) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/inventory/${ingredient_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Failed to delete ingredient.');
    }
  };

  // Recipe CRUD: Add, Edit Portion & Delete
  const handleAddRecipe = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/vendor/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newRecipe)
      });
      const data = await res.json();
      if (data.success) {
        setNewRecipe(prev => ({ ...prev, quantity_required: '' }));
        fetchData();
      }
    } catch (err) {
      alert('Failed to save recipe link.');
    }
  };

  const openEditRecipeModal = (r) => {
    setEditingRecipe(r);
    setEditRecipeForm({
      recipe_id: r.recipe_id,
      dish_name: r.dish_name,
      ingredient_name: r.ingredient_name,
      quantity_required: r.quantity_required,
      unit: r.unit
    });
  };

  const handleSaveEditRecipe = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/recipes/${editRecipeForm.recipe_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity_required: editRecipeForm.quantity_required })
      });
      const data = await res.json();
      if (data.success) {
        setEditingRecipe(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to update recipe portion.');
    }
  };

  const handleDeleteRecipe = async (recipe_id) => {
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/recipes/${recipe_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Failed to delete recipe link.');
    }
  };

  const updateOrderStatus = async (order_id, status) => {
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/orders/${order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Failed to update order status.');
    }
  };

  // Dedicated Login View
  if (!user || user.role !== 'VENDOR') {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="glass-card rounded-3xl p-8 border border-slate-800 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <ChefHat className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Chef Console Site</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Log in to manage kitchen orders, dish recipes & stock availability</p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chef Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full mt-1.5 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-emerald-500 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all"
            >
              Sign In to Chef Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loadingInitial && dishes.length === 0) {
    return (
      <KitchenLoadingScreen 
        message="ChefHub Kitchen Console" 
        subMessage="Loading kitchen dishes, ingredient inventory & orders..." 
      />
    );
  }

  // Logged-in Chef Console View
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-5 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <ChefHat className="w-3.5 h-3.5" /> Kitchen Management Console
            </span>

            {/* Live Store Open / Closed Status Toggle Button */}
            <button
              onClick={handleInitiateKitchenToggle}
              className={`px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                storeProfile.is_open
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/30'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-rose-500/25 ring-2 ring-rose-400/30'
              }`}
              title="Click to toggle whether your kitchen is open to accept orders"
            >
              <span className={`w-2 h-2 rounded-full ${storeProfile.is_open ? 'bg-white animate-pulse' : 'bg-rose-200'}`}></span>
              {storeProfile.is_open ? 'STORE OPEN (Accepting Orders)' : 'STORE CLOSED (Offline)'}
            </button>

            {/* Operating Hours Settings Button */}
            <button
              onClick={() => setShowHoursModal(true)}
              className="px-3.5 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Hours: {storeProfile.operating_hours || '11:00 AM - 10:00 PM'}
            </button>
          </div>

          {!storeProfile.is_open && storeProfile.closed_reason && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
              <Ban className="w-4 h-4 shrink-0 text-rose-500" />
              <span>Current Closure Reason: "{storeProfile.closed_reason}"</span>
            </div>
          )}

          {autoReopenedNotice && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>🌅 New day detected! Kitchen automatically re-opened for orders today.</span>
              </div>
              <button onClick={() => setAutoReopenedNotice(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">✕</button>
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-black font-display text-slate-900 dark:text-white tracking-tight">{user.name}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Manage dish menu, real-time stock availability, ingredient inventory, and kitchen orders</p>
        </div>

        {/* Modern Segmented Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/60 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-300/80 dark:border-slate-800 text-xs font-bold shadow-inner">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'dishes' 
                ? 'bg-white dark:bg-emerald-500 text-emerald-800 dark:text-slate-950 shadow-md font-black border border-emerald-200/80 dark:border-emerald-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Dishes Menu ({dishes.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'orders' 
                ? 'bg-white dark:bg-emerald-500 text-emerald-800 dark:text-slate-950 shadow-md font-black border border-emerald-200/80 dark:border-emerald-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Kitchen Order Queue
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'inventory' 
                ? 'bg-white dark:bg-emerald-500 text-emerald-800 dark:text-slate-950 shadow-md font-black border border-emerald-200/80 dark:border-emerald-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Stock Inventory ({inventory.length})
          </button>

          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'recipes' 
                ? 'bg-white dark:bg-emerald-500 text-emerald-800 dark:text-slate-950 shadow-md font-black border border-emerald-200/80 dark:border-emerald-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Recipe Builder
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'payouts' 
                ? 'bg-white dark:bg-emerald-500 text-emerald-800 dark:text-slate-950 shadow-md font-black border border-emerald-200/80 dark:border-emerald-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Payout Earnings
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'reviews' 
                ? 'bg-white dark:bg-emerald-500 text-emerald-800 dark:text-slate-950 shadow-md font-black border border-emerald-200/80 dark:border-emerald-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Customer Reviews ({chefReviews.length})
          </button>
        </div>
      </div>

      {/* Tab: Dishes Menu CRUD with Real-time Stock Toggle & Edit Modal */}
      {activeTab === 'dishes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2 Cols: Dishes Table */}
          <div className="lg:col-span-2 glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-5 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                  <Utensils className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">Dishes Menu & Live Stock</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manage pricing, portion counters, and real-time customer availability</p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-black flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {dishes.length} Dishes Registered
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 pl-4 rounded-l-2xl">Dish</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Price (₹)</th>
                    <th className="p-3.5">Daily Portion Stock</th>
                    <th className="p-3.5">Stock Status</th>
                    <th className="p-3.5 pr-4 rounded-r-2xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {dishes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6">
                        <KitchenDataLoader message="Loading Dishes Menu..." subText="Connecting to kitchen catalog and dishes..." />
                        <KitchenSkeletonRows rows={4} cols={6} />
                      </td>
                    </tr>
                  ) : (
                    dishes.map((d) => {
                      const isAvail = d.is_available === 1 || d.is_available === true;
                      const stockNum = Number(d.daily_stock !== undefined ? d.daily_stock : 20);
                    return (
                      <tr key={d.dish_id} className="group hover:bg-amber-500/[0.03] dark:hover:bg-slate-800/40 transition-all">
                        <td className="p-3.5 pl-4">
                          <div className="flex items-center gap-3.5">
                            {d.image_url ? (
                              <img src={d.image_url} alt={d.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-md group-hover:scale-105 transition-transform shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs ring-2 ring-slate-100 dark:ring-slate-800 shrink-0">
                                <Utensils className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm font-display group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">{d.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 font-mono font-bold">ID #{d.dish_id}</span>
                                {d.dietary_tags && d.dietary_tags[0] && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {d.dietary_tags[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
                            {d.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-black text-amber-600 dark:text-amber-400 text-sm font-display tracking-tight">
                          ₹{Number(d.base_price).toFixed(2)}
                        </td>
                        
                        {/* Daily Portion Stock Counter & Dynamic Stepper */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(d.dish_id, -1)}
                              disabled={stockNum <= 0}
                              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                              title="Decrease 1 portion"
                            >
                              -
                            </button>
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border text-center min-w-[56px] shadow-sm transition-colors ${
                              stockNum > 5 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30' 
                                : stockNum > 0 
                                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30' 
                                : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
                            }`}>
                              {stockNum}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(d.dish_id, +5)}
                              className="px-2 h-7 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center transition-all active:scale-90 shadow-sm border border-emerald-200 dark:border-emerald-500/30 cursor-pointer"
                              title="Add +5 portions"
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        {/* Real-Time Stock Status Toggle Button */}
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleStock(d.dish_id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 ${
                              isAvail
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40'
                            }`}
                            title="Click to toggle real-time stock status"
                          >
                            <span className={`w-2 h-2 rounded-full ${isAvail ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-rose-500'}`} />
                            <span>{isAvail ? 'In Stock' : 'Out of Stock'}</span>
                          </button>
                        </td>

                        {/* Edit & Delete Action Buttons */}
                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(d)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white dark:bg-slate-800 dark:hover:bg-amber-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                              title="Edit dish details"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDish(d.dish_id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                              title="Delete dish from menu"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Col: Add New Dish Form */}
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-5 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white tracking-tight">Add New Dish</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Publish a handcrafted meal to your catalog</p>
              </div>
            </div>

            <form onSubmit={handleAddDish} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">Dish Name</label>
                <input
                  type="text"
                  value={newDish.name}
                  onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                  placeholder="e.g. Handmade Truffle Gnocchi"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <input
                    type="text"
                    value={newDish.category}
                    onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                    placeholder="Pasta / Curry"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDish.base_price}
                    onChange={(e) => setNewDish({ ...newDish, base_price: e.target.value })}
                    placeholder="e.g. 280"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 font-black font-display outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/20 dark:border-emerald-500/30 space-y-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Daily Portion Target</span>
                  </label>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    Number(newDish.daily_stock) > 5 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' 
                      : Number(newDish.daily_stock) > 0 
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30' 
                      : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                  }`}>
                    {Number(newDish.daily_stock) > 0 ? `${newDish.daily_stock} portions` : 'Depleted (0)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(newDish.daily_stock !== undefined && newDish.daily_stock !== null ? newDish.daily_stock : 20);
                      const next = Math.max(0, cur - 1);
                      setNewDish({ ...newDish, daily_stock: next, is_available: next > 0 });
                    }}
                    className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 font-black text-lg text-slate-900 dark:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                    title="Decrease portions by 1"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={newDish.daily_stock}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setNewDish({ ...newDish, daily_stock: val, is_available: val > 0 });
                    }}
                    placeholder="20"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black font-mono text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(newDish.daily_stock !== undefined && newDish.daily_stock !== null ? newDish.daily_stock : 20);
                      const next = cur + 1;
                      setNewDish({ ...newDish, daily_stock: next, is_available: true });
                    }}
                    className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 font-black text-lg text-slate-900 dark:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                    title="Increase portions by 1"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Quick Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '+5', calc: (c) => c + 5 },
                      { label: '+10', calc: (c) => c + 10 },
                      { label: '+20', calc: (c) => c + 20 },
                      { label: 'Set 25', calc: () => 25 },
                      { label: 'Set 50', calc: () => 50 },
                      { label: 'Depleted (0)', calc: () => 0 }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const cur = Number(newDish.daily_stock !== undefined && newDish.daily_stock !== null ? newDish.daily_stock : 20);
                          const nextVal = Math.max(0, preset.calc(cur));
                          setNewDish({ ...newDish, daily_stock: nextVal, is_available: nextVal > 0 });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-300 text-[10px] font-extrabold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">Food Image URL</label>
                <input
                  type="url"
                  value={newDish.image_url}
                  onChange={(e) => setNewDish({ ...newDish, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
                />
                
                {/* Image Quick Presets */}
                <div className="space-y-1.5 mt-2.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Quick Food Photo Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetImages.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewDish({ ...newDish, image_url: p.url, category: newDish.category || p.label.replace(/[^a-zA-Z]/g, '') })}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-300 text-[10px] font-extrabold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">Description</label>
                <textarea
                  rows="2"
                  value={newDish.description}
                  onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                  placeholder="Brief culinary description, key seasonings, flavor profile..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all resize-none"
                />
              </div>

              <div className="pt-1">
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1.5">Initial Stock Availability</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer font-black text-xs transition-all ${
                    newDish.is_available 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20' 
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="newDishStock"
                      checked={newDish.is_available === true}
                      onChange={() => setNewDish({ ...newDish, is_available: true })}
                      className="accent-emerald-500 hidden"
                    />
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>In Stock</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer font-black text-xs transition-all ${
                    !newDish.is_available 
                      ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40 shadow-sm ring-1 ring-rose-500/20' 
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="newDishStock"
                      checked={newDish.is_available === false}
                      onChange={() => setNewDish({ ...newDish, is_available: false })}
                      className="accent-rose-500 hidden"
                    />
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Out of Stock</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 text-white font-black text-sm tracking-wide shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transform active:scale-98 transition-all cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Save New Dish to Menu</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Edit Dish Modal Window */}
      {editingDish && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-fade-in">
          <form 
            onSubmit={handleSaveEditDish}
            className="glass-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* STICKY TOP HEADER */}
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-sm">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black font-display text-slate-900 dark:text-white text-base flex items-center gap-1.5">
                    Edit Dish #{editForm.dish_id}
                    {editForm.name && (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                        · {editForm.name}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Update pricing, live portions and availability</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingDish(null)} 
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SCROLLABLE FORM BODY */}
            <div className="overflow-y-auto px-6 py-4 space-y-4 text-xs flex-1 custom-scrollbar">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Dish Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold shadow-sm transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium shadow-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.base_price}
                    onChange={(e) => setEditForm({ ...editForm, base_price: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-black shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Portions in Stock Field with Steppers & Quick Chips */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <Package className="w-4 h-4 text-amber-500" />
                    <span>Portions in Stock (Daily Availability Target)</span>
                  </label>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    Number(editForm.daily_stock) > 5 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' 
                      : Number(editForm.daily_stock) > 0 
                      ? 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' 
                      : 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                  }`}>
                    {Number(editForm.daily_stock) > 0 ? `${editForm.daily_stock} portions ready` : 'Depleted (0 remaining)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(editForm.daily_stock !== undefined && editForm.daily_stock !== null ? editForm.daily_stock : 20);
                      const next = Math.max(0, cur - 1);
                      setEditForm({
                        ...editForm,
                        daily_stock: next,
                        is_available: next > 0,
                        out_of_stock_reason: next === 0 ? 'Daily portions fully exhausted (0 remaining)' : (editForm.out_of_stock_reason === 'Daily portions fully exhausted (0 remaining)' ? 'In Stock' : editForm.out_of_stock_reason)
                      });
                    }}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-black text-lg text-slate-900 dark:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                    title="Decrease portions by 1"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={editForm.daily_stock !== undefined && editForm.daily_stock !== null ? editForm.daily_stock : 20}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setEditForm({
                        ...editForm,
                        daily_stock: val,
                        is_available: val > 0,
                        out_of_stock_reason: val === 0 ? 'Daily portions fully exhausted (0 remaining)' : (editForm.out_of_stock_reason === 'Daily portions fully exhausted (0 remaining)' ? 'In Stock' : editForm.out_of_stock_reason)
                      });
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white font-black text-center text-base outline-none focus:border-amber-500 shadow-inner"
                    placeholder="e.g. 25"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(editForm.daily_stock !== undefined && editForm.daily_stock !== null ? editForm.daily_stock : 20);
                      const next = cur + 1;
                      setEditForm({
                        ...editForm,
                        daily_stock: next,
                        is_available: true,
                        out_of_stock_reason: editForm.out_of_stock_reason === 'Daily portions fully exhausted (0 remaining)' ? 'In Stock' : editForm.out_of_stock_reason
                      });
                    }}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-black text-lg text-slate-900 dark:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                    title="Increase portions by 1"
                  >
                    +
                  </button>
                </div>

                {/* Stock Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Presets:</span>
                  {[
                    { label: '+5', calc: (c) => c + 5 },
                    { label: '+10', calc: (c) => c + 10 },
                    { label: '+20', calc: (c) => c + 20 },
                    { label: 'Set 25', calc: () => 25 },
                    { label: 'Set 50', calc: () => 50 },
                    { label: 'Depleted (0)', calc: () => 0 }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const cur = Number(editForm.daily_stock !== undefined && editForm.daily_stock !== null ? editForm.daily_stock : 20);
                        const nextVal = Math.max(0, preset.calc(cur));
                        setEditForm({
                          ...editForm,
                          daily_stock: nextVal,
                          is_available: nextVal > 0,
                          out_of_stock_reason: nextVal === 0 ? 'Daily portions fully exhausted (0 remaining)' : (editForm.out_of_stock_reason === 'Daily portions fully exhausted (0 remaining)' ? 'In Stock' : editForm.out_of_stock_reason)
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Food Image URL</label>
                <input
                  type="url"
                  value={editForm.image_url}
                  onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs shadow-sm transition-all"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-500 font-bold mr-1">Image Presets:</span>
                  {presetImages.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, image_url: p.url })}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700 transition-all shadow-sm cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Brief culinary description..."
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm transition-all resize-none"
                />
              </div>

              <div className="pt-1">
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1.5">Stock Availability Status</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer font-black text-xs transition-all ${
                    editForm.is_available 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20' 
                      : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="editDishStock"
                      checked={editForm.is_available === true}
                      onChange={() => {
                        const cur = Number(editForm.daily_stock !== undefined && editForm.daily_stock !== null ? editForm.daily_stock : 0);
                        const nextStock = cur <= 0 ? 20 : cur;
                        setEditForm({
                          ...editForm,
                          is_available: true,
                          daily_stock: nextStock,
                          out_of_stock_reason: 'In Stock'
                        });
                      }}
                      className="accent-emerald-500 hidden"
                    />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>In Stock (Orderable)</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer font-black text-xs transition-all ${
                    !editForm.is_available 
                      ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40 shadow-sm ring-1 ring-rose-500/20' 
                      : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="editDishStock"
                      checked={editForm.is_available === false}
                      onChange={() => setEditForm({
                        ...editForm,
                        is_available: false,
                        daily_stock: 0,
                        out_of_stock_reason: editForm.out_of_stock_reason === 'In Stock' ? 'Daily portions fully exhausted (0 remaining)' : (editForm.out_of_stock_reason || 'Daily portions fully exhausted (0 remaining)')
                      })}
                      className="accent-rose-500 hidden"
                    />
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Out of Stock</span>
                  </label>
                </div>
              </div>

              {/* Conditional Out-of-Stock Reason banner display: ONLY show when dish is Out of Stock */}
              {!editForm.is_available && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>Out-of-Stock Reason (Customer Portal Banner)</span>
                    </label>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black px-2 py-0.5 rounded-full bg-rose-500/15">Customer Visible</span>
                  </div>
                  
                  {/* Preset Pills GUI */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Daily portions fully exhausted (0 remaining)',
                      'Raw ingredient shortage (Required ingredients depleted in stock)',
                      'Kitchen prep closed for today',
                      'Seasonal ingredient unavailable',
                      'Chef maintenance & sanitation day'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, out_of_stock_reason: preset })}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold border transition-all cursor-pointer ${
                          editForm.out_of_stock_reason === preset
                            ? 'bg-rose-500 text-white font-black border-rose-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows="2"
                    value={editForm.out_of_stock_reason || ''}
                    onChange={(e) => setEditForm({ ...editForm, out_of_stock_reason: e.target.value })}
                    placeholder="Enter reason why dish is out of stock..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* STICKY BOTTOM FOOTER */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md shrink-0 z-10">
              <button
                type="button"
                onClick={() => setEditingDish(null)}
                className="flex-1 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Save Dish Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Kitchen Orders Queue */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">Live Kitchen Order Display System (KDS)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real-time incoming orders, preparation status, and driver dispatch</p>
              </div>
            </div>
            <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-black shadow-sm">
              {orders.length} Active Ticket{orders.length !== 1 ? 's' : ''}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 glass-card bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No incoming orders in queue</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Incoming customer orders will appear here in real-time</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((o) => (
                <div key={o.order_id} className="glass-card rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-4 flex flex-col justify-between shadow-xl shadow-slate-200/40 dark:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-black font-display text-slate-900 dark:text-white text-base">Order #{o.order_id}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                        o.status === 'READY' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40' :
                        o.status === 'PREPARING' ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40' :
                        'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40'
                      }`}>
                        {o.status}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 text-xs space-y-1">
                      <p className="text-slate-600 dark:text-slate-300 font-medium">Customer: <strong className="text-slate-900 dark:text-white font-extrabold">{o.customer_name}</strong> ({o.customer_phone})</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">{new Date(o.timestamp).toLocaleString()}</p>
                    </div>

                    <div className="space-y-1.5 pt-1 text-xs">
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider block">Items Ordered:</span>
                      <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {o.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800/70 text-xs">
                            <span className="font-bold">{item.dish_name}</span>
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-xs border border-emerald-500/20">
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    {o.status === 'PLACED' && (
                      <button
                        onClick={() => updateOrderStatus(o.order_id, 'PREPARING')}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                      >
                        Accept & Start Prep
                      </button>
                    )}
                    {o.status === 'PREPARING' && (
                      <button
                        onClick={() => updateOrderStatus(o.order_id, 'READY')}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                      >
                        Mark Ready for Driver Pickup
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Stock Inventory CRUD */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-5 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">Kitchen Raw Ingredient Inventory</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Track stock levels, units, and automatic reorder thresholds</p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-black shadow-sm">
                {inventory.length} Ingredients Registered
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Ingredient</th>
                    <th className="p-3.5">Current Stock</th>
                    <th className="p-3.5">Reorder Threshold</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {inventory.map((inv) => {
                    const isLow = Number(inv.stock_quantity) <= Number(inv.reorder_level);
                    return (
                      <tr key={inv.ingredient_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">{inv.ingredient_name}</td>
                        <td className="p-3.5">
                          <span className={`font-mono font-black px-2.5 py-1 rounded-lg border text-xs shadow-sm ${
                            isLow 
                              ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                          }`}>
                            {parseFloat(Number(inv.stock_quantity).toFixed(2))} {inv.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-bold">{parseFloat(Number(inv.reorder_level).toFixed(2))} {inv.unit}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditIngredientModal(inv)}
                              className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 font-black text-[11px] transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                              title="Edit ingredient stock or reorder alert"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(inv.ingredient_id)}
                              className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30 font-black text-[11px] transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                              title="Delete ingredient from inventory"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Restock Ingredient with Standardized Dropdown Selection */}
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-5 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl h-fit sticky top-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Add / Restock Ingredient
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Register ingredients or increase bulk pantry stocks</p>
            </div>
            
            <form onSubmit={handleAddIngredient} className="space-y-4 text-xs">
              {/* Standardized Ingredient Dropdown */}
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Standardized Ingredient Selector</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) setNewIngredient({ ...newIngredient, ingredient_name: e.target.value });
                  }}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold shadow-sm transition-all"
                >
                  <option value="">-- Pick Standardized Ingredient --</option>
                  <option value="Artisanal Pasta Flour">Artisanal Pasta Flour</option>
                  <option value="Fresh Burrata Cheese">Fresh Burrata Cheese</option>
                  <option value="Parmesan Cheese">Parmesan Cheese</option>
                  <option value="Truffle Oil">Truffle Oil</option>
                  <option value="Wild Truffle Paste">Wild Truffle Paste</option>
                  <option value="Extra Virgin Olive Oil">Extra Virgin Olive Oil</option>
                  <option value="San Marzano Tomatoes">San Marzano Tomatoes</option>
                  <option value="Fresh Basil">Fresh Basil</option>
                  <option value="Heavy Cream">Heavy Cream</option>
                  <option value="Garlic Cloves">Garlic Cloves</option>
                  <option value="Butter">Butter</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Prevents database casing inconsistencies (e.g. 'truffle oil' vs 'Truffle Oil').</p>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Ingredient Name (Title Case)</label>
                <input
                  type="text"
                  value={newIngredient.ingredient_name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, ingredient_name: e.target.value })}
                  placeholder="e.g. Truffle Oil"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold shadow-sm transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Stock Qty</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newIngredient.stock_quantity}
                    onChange={(e) => setNewIngredient({ ...newIngredient, stock_quantity: e.target.value })}
                    placeholder="50"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold shadow-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Unit</label>
                  <input
                    type="text"
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                    placeholder="liters / kg / units"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Reorder Alert Level</label>
                <input
                  type="number"
                  step="0.1"
                  value={newIngredient.reorder_level}
                  onChange={(e) => setNewIngredient({ ...newIngredient, reorder_level: e.target.value })}
                  placeholder="5"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold shadow-sm transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer mt-1"
              >
                Save Ingredient Stock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ingredient Modal */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black font-display text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Edit Ingredient #{editIngredientForm.ingredient_id}
              </h3>
              <button onClick={() => setEditingIngredient(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditIngredient} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Ingredient Name</label>
                <input
                  type="text"
                  value={editIngredientForm.ingredient_name}
                  onChange={(e) => setEditIngredientForm({ ...editIngredientForm, ingredient_name: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-sm transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Current Stock Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editIngredientForm.stock_quantity}
                    onChange={(e) => setEditIngredientForm({ ...editIngredientForm, stock_quantity: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Unit</label>
                  <input
                    type="text"
                    value={editIngredientForm.unit}
                    onChange={(e) => setEditIngredientForm({ ...editIngredientForm, unit: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Reorder Alert Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={editIngredientForm.reorder_level}
                  onChange={(e) => setEditIngredientForm({ ...editIngredientForm, reorder_level: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-sm transition-all"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
                  className="flex-1 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer"
                >
                  Save Ingredient Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    {/* Tab: Organized Grouped Recipe Builder */}
    {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <Utensils className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">Organized Dish Recipe Cards</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">All required raw ingredients consolidated under each single recipe portion</p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-black shadow-sm">
                {dishes.length} Dish Recipes
              </span>
            </div>

            {/* Grouped Dish Recipe Cards */}
            <div className="space-y-4">
              {dishes.map((dish) => {
                const dishRecipes = recipes.filter(r => Number(r.dish_id) === Number(dish.dish_id));
                return (
                  <div key={dish.dish_id} className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-4 shadow-xl shadow-slate-200/40 dark:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex flex-wrap justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Utensils className="w-4 h-4" />
                        </div>
                        <h3 className="font-black font-display text-slate-900 dark:text-white text-base">{dish.name}</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold border border-slate-200 dark:border-slate-700">
                          ₹{Number(dish.base_price).toFixed(2)}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full shadow-sm">
                        {dishRecipes.length} Ingredient{dishRecipes.length !== 1 ? 's' : ''} Mapped
                      </span>
                    </div>

                    {dishRecipes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl px-4 border border-dashed border-slate-200 dark:border-slate-800">No ingredient links mapped for this dish yet. Map ingredients using the form on the right.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                            <tr>
                              <th className="p-3">Required Ingredient</th>
                              <th className="p-3">Portion Quantity</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {dishRecipes.map((r) => (
                              <tr key={r.recipe_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-3 font-extrabold text-slate-900 dark:text-white">{r.ingredient_name}</td>
                                <td className="p-3">
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                    {parseFloat(Number(r.quantity_required).toFixed(2))} {r.unit}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => openEditRecipeModal(r)}
                                      className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 font-black text-[11px] transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                                      title="Edit portion quantity required for recipe"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" /> Edit Qty
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecipe(r.recipe_id)}
                                      className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30 font-black text-[11px] transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                                      title="Remove ingredient link from dish recipe"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Map Dish to Ingredient Form */}
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-5 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl h-fit sticky top-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Map Dish to Ingredient
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Define raw ingredient portion required per dish preparation</p>
            </div>

            <form onSubmit={handleAddRecipe} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Select Dish Recipe</label>
                <select
                  value={newRecipe.dish_id}
                  onChange={(e) => setNewRecipe({ ...newRecipe, dish_id: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold shadow-sm transition-all"
                  required
                >
                  <option value="">-- Choose Dish --</option>
                  {dishes.map((d) => (
                    <option key={d.dish_id} value={d.dish_id}>{d.name} (₹{Number(d.base_price).toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Select Ingredient</label>
                <select
                  value={newRecipe.ingredient_id}
                  onChange={(e) => setNewRecipe({ ...newRecipe, ingredient_id: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold shadow-sm transition-all"
                  required
                >
                  <option value="">-- Choose Ingredient --</option>
                  {inventory.map((inv) => (
                    <option key={inv.ingredient_id} value={inv.ingredient_id}>{inv.ingredient_name} ({parseFloat(Number(inv.stock_quantity).toFixed(2))} {inv.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Quantity Required per Portion</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRecipe.quantity_required}
                  onChange={(e) => setNewRecipe({ ...newRecipe, quantity_required: e.target.value })}
                  placeholder="e.g. 0.25"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold shadow-sm transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer mt-1"
              >
                Save Recipe Junction Link
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Recipe Portion Modal */}
      {editingRecipe && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black font-display text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Edit Recipe Portion Quantity
              </h3>
              <button onClick={() => setEditingRecipe(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRecipe} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Dish Name</label>
                <input
                  type="text"
                  value={editRecipeForm.dish_name}
                  disabled
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Required Ingredient</label>
                <input
                  type="text"
                  value={editRecipeForm.ingredient_name}
                  disabled
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Quantity Required per Portion ({editRecipeForm.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={editRecipeForm.quantity_required}
                  onChange={(e) => setEditRecipeForm({ ...editRecipeForm, quantity_required: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-sm transition-all"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRecipe(null)}
                  className="flex-1 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer"
                >
                  Update Portion Qty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Payout Earnings */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden glass-card rounded-3xl p-7 sm:p-8 border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950 shadow-xl shadow-emerald-500/5 flex flex-wrap justify-between items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Total Chef Net Revenue (85% Split)</span>
                {loadingPayouts && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />}
              </div>
              <h2 className="text-4xl sm:text-5xl font-black font-display text-emerald-700 dark:text-emerald-400 tracking-tight">₹{payouts.total_earned}</h2>
            </div>
            <div className="text-right space-y-1.5">
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-black inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Direct Escrow Payouts Active
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Zero-lag cached balance with live background ledger sync</p>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-5 shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black font-display text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Escrow Payout Ledger</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">({payouts.payouts?.length || 0} transactions)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Automatic disbursement audit trail for delivered customer orders</p>
                </div>
              </div>
              <button 
                onClick={() => fetchPayouts(true)} 
                disabled={loadingPayouts}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPayouts ? 'animate-spin text-emerald-500' : ''}`} />
                <span>Refresh Ledger</span>
              </button>
            </div>

            {loadingPayouts && (!payouts.payouts || payouts.payouts.length === 0) ? (
              <div className="space-y-4">
                <KitchenDataLoader 
                  message="Syncing Escrow Ledgers & Calculating Net Payouts..." 
                  subText="Calculating escrow disbursements and 85% chef earnings..." 
                />
                <KitchenSkeletonRows rows={5} />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Payout ID</th>
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Order Status</th>
                      <th className="p-3.5">Chef 85% Split</th>
                      <th className="p-3.5">Disbursement Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {payouts.payouts && payouts.payouts.length > 0 ? (
                      payouts.payouts.map((p) => (
                        <tr key={p.payout_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-mono text-slate-500 font-bold">#{p.payout_id}</td>
                          <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">Order #{p.order_id}</td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                              {p.order_status || 'COMPLETED'}
                            </span>
                          </td>
                          <td className="p-3.5 font-black text-emerald-700 dark:text-emerald-400 text-sm">₹{Number(p.vendor_amount).toFixed(2)}</td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">{new Date(p.executed_at).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                          No escrow payouts recorded yet for this kitchen. Completed customer orders will appear here automatically.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Customer Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-5 shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                  <Star className="w-5 h-5 fill-slate-950 text-slate-950" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">Kitchen Customer Ratings & Feedback</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real-time reviews and NLP sentiment scoring from verified customers</p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black border border-emerald-500/20 shadow-sm">
                {chefReviews.length} Verified Customer Reviews
              </span>
            </div>

            {chefReviews.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No customer reviews yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Feedback from diners who enjoy your creations will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {chefReviews.map((r, i) => (
                  <div key={r.review_id || i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/20">
                          {(r.customer_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white text-sm">{r.customer_name || 'Customer'}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Order #{r.order_id}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-sm ${
                        r.sentiment_label === 'POSITIVE' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30' 
                          : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                      }`}>
                        {r.sentiment_label || 'POSITIVE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500 text-sm">
                      {Array.from({ length: r.vendor_rating || 5 }).map((_, starIdx) => (
                        <Star key={starIdx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-inner">
                      "{r.comment || 'Delicious meal!'}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Operating Hours Modal */}
      {showHoursModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 w-full max-w-md space-y-4 shadow-2xl bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-black font-display text-slate-900 dark:text-white text-base">Operating Hours & Store Profile</h3>
              </div>
              <button
                onClick={() => setShowHoursModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHours} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Display Operating Hours Text</label>
                <input
                  type="text"
                  value={hoursForm.operating_hours}
                  onChange={(e) => setHoursForm({ ...hoursForm, operating_hours: e.target.value })}
                  placeholder="e.g. 11:00 AM - 10:00 PM"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Opening Time (24h)</label>
                  <input
                    type="time"
                    value={hoursForm.open_time}
                    onChange={(e) => setHoursForm({ ...hoursForm, open_time: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Closing Time (24h)</label>
                  <input
                    type="time"
                    value={hoursForm.close_time}
                    onChange={(e) => setHoursForm({ ...hoursForm, close_time: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300">Kitchen Bio & Announcement</label>
                <textarea
                  value={hoursForm.chef_bio}
                  onChange={(e) => setHoursForm({ ...hoursForm, chef_bio: e.target.value })}
                  rows={2}
                  placeholder="e.g. Specializing in artisanal hand-rolled pasta and wood-fired gourmet specialties."
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHoursModal(false)}
                  className="w-1/2 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
                >
                  Save Timings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Store Closure Reason Modal */}
      {showCloseReasonModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 w-full max-w-md space-y-4 shadow-2xl bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-500">
                <Ban className="w-5 h-5" />
                <h3 className="font-black font-display text-slate-900 dark:text-white text-base">Close Kitchen & Set Reason</h3>
              </div>
              <button
                onClick={() => setShowCloseReasonModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseKitchen} className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400 font-medium">Select or type a closure reason to display to customers on the marketplace while your kitchen is offline:</p>

              <div className="space-y-2">
                {[
                  'Chef has manually closed the kitchen for today (Offline).',
                  'Sold out of ingredients & portions for today.',
                  'Kitchen maintenance / Private catering event in progress.',
                  'Taking a personal day.',
                  'CUSTOM'
                ].map((reasonOption) => (
                  <label
                    key={reasonOption}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedPresetReason === reasonOption
                        ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40 font-black shadow-sm ring-1 ring-rose-500/20'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="closureReason"
                      checked={selectedPresetReason === reasonOption}
                      onChange={() => setSelectedPresetReason(reasonOption)}
                      className="accent-rose-500"
                    />
                    <span>{reasonOption === 'CUSTOM' ? 'Type custom reason...' : reasonOption}</span>
                  </label>
                ))}
              </div>

              {selectedPresetReason === 'CUSTOM' && (
                <div className="pt-1">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">Custom Reason Message</label>
                  <input
                    type="text"
                    value={customReasonInput}
                    onChange={(e) => setCustomReasonInput(e.target.value)}
                    placeholder="e.g., Closed early for private wedding catering event."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium shadow-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required={selectedPresetReason === 'CUSTOM'}
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCloseReasonModal(false)}
                  className="w-1/2 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black shadow-lg shadow-rose-500/25 transition-all active:scale-95 cursor-pointer"
                >
                  Confirm Close Kitchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
