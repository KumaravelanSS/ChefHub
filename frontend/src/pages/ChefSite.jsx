import React, { useState, useEffect } from 'react';
import { ChefHat, Package, Utensils, DollarSign, AlertTriangle, CheckCircle2, Clock, Plus, Trash2, AlertCircle, Edit3, Image as ImageIcon, X, Sparkles, Ban, Eye, EyeOff } from 'lucide-react';

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
  const [payouts, setPayouts] = useState({ total_earned: '0.00', payouts: [] });
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

  useEffect(() => {
    if (user && user.role === 'VENDOR') {
      fetchData();
      const interval = setInterval(() => {
        fetchData();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    const token = localStorage.getItem('chefhub_token');
    const headers = { Authorization: `Bearer ${token}` };

    if (activeTab === 'dishes') {
      const res = await fetch('/api/vendor/dishes', { headers });
      const data = await res.json();
      if (data.success) {
        setDishes(data.dishes);
        if (data.dishes.length > 0 && !newRecipe.dish_id) setNewRecipe(prev => ({ ...prev, dish_id: data.dishes[0].dish_id }));
      }
    } else if (activeTab === 'orders') {
      const res = await fetch('/api/vendor/orders', { headers });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } else if (activeTab === 'inventory') {
      const res = await fetch('/api/vendor/inventory', { headers });
      const data = await res.json();
      if (data.success) {
        setInventory(data.inventory);
        if (data.inventory.length > 0 && !newRecipe.ingredient_id) setNewRecipe(prev => ({ ...prev, ingredient_id: data.inventory[0].ingredient_id }));
      }
    } else if (activeTab === 'recipes') {
      const resDishes = await fetch('/api/vendor/dishes', { headers });
      const dataDishes = await resDishes.json();
      if (dataDishes.success) setDishes(dataDishes.dishes);

      const resInv = await fetch('/api/vendor/inventory', { headers });
      const dataInv = await resInv.json();
      if (dataInv.success) setInventory(dataInv.inventory);

      const res = await fetch('/api/vendor/recipes', { headers });
      const data = await res.json();
      if (data.success) setRecipes(data.recipes);
    } else if (activeTab === 'payouts') {
      const res = await fetch('/api/vendor/payouts', { headers });
      const data = await res.json();
      if (data.success) setPayouts(data);
    } else if (activeTab === 'reviews') {
      const res = await fetch('/api/vendor/reviews', { headers });
      const data = await res.json();
      if (data.success) setChefReviews(data.reviews);
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
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/vendor/dishes/${dish_id}/toggle-stock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to toggle stock status.');
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

  // Logged-in Chef Console View
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5" /> Kitchen Management
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{user.name}</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">Manage dish menu, real-time stock availability, ingredient inventory, and kitchen orders</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 text-xs font-bold shadow-inner">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'dishes' ? 'bg-emerald-500 text-white shadow-md font-black' : 'text-slate-700 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Dishes Menu ({dishes.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'orders' ? 'bg-emerald-500 text-white shadow-md font-black' : 'text-slate-700 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Kitchen Order Queue
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'inventory' ? 'bg-emerald-500 text-white shadow-md font-black' : 'text-slate-700 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Stock Inventory ({inventory.length})
          </button>

          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'recipes' ? 'bg-emerald-500 text-white shadow-md font-black' : 'text-slate-700 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Recipe Builder
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'payouts' ? 'bg-emerald-500 text-white shadow-md font-black' : 'text-slate-700 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Payout Earnings
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'reviews' ? 'bg-emerald-500 text-white shadow-md font-black' : 'text-slate-700 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white'
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
          <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-slate-300 dark:border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-800/80 pb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Dishes Menu & Real-Time Stock Controls</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">Modify dish names, daily portion stocks, prices, and toggle real-time customer stock availability</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                {dishes.length} Dishes Registered
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Dish</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Daily Portion Stock</th>
                    <th className="p-3">Stock Status</th>
                    <th className="p-3 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 dark:divide-slate-800/60">
                  {dishes.map((d) => {
                    const isAvail = d.is_available === 1 || d.is_available === true;
                    return (
                      <tr key={d.dish_id} className="hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {d.image_url ? (
                              <img src={d.image_url} alt={d.name} className="w-10 h-10 rounded-xl object-cover border border-slate-300 dark:border-slate-800 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                                <Utensils className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{d.name}</h4>
                              <span className="text-[10px] text-slate-500 font-mono">ID #{d.dish_id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{d.category}</td>
                        <td className="p-3 font-black text-amber-600 dark:text-amber-400">${Number(d.base_price).toFixed(2)}</td>
                        
                        {/* Daily Portion Stock Counter */}
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                            Number(d.daily_stock) > 5 ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' :
                            Number(d.daily_stock) > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}>
                            {d.daily_stock !== undefined ? `${d.daily_stock} left` : '20 left'}
                          </span>
                        </td>

                        {/* Real-Time Stock Status Toggle Button */}
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleStock(d.dish_id)}
                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-black transition-all flex items-center gap-1.5 shadow-sm ${
                              isAvail
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                            }`}
                            title="Click to toggle real-time stock status"
                          >
                            <span className={`w-2 h-2 rounded-full ${isAvail ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                            <span>{isAvail ? 'In Stock' : 'Out of Stock'}</span>
                          </button>
                        </td>

                        {/* Edit & Delete Action Buttons */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(d)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold text-[11px] transition-all flex items-center gap-1"
                              title="Edit dish name, image URL, daily stock, price or description"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDish(d.dish_id)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-[11px] transition-all flex items-center gap-1"
                              title="Delete dish from menu"
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

          {/* Right Col: Add New Dish Form */}
          <div className="glass-card rounded-3xl p-6 border border-slate-300 dark:border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-3">+ Add New Dish to Menu</h3>
            <form onSubmit={handleAddDish} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Dish Name</label>
                <input
                  type="text"
                  value={newDish.name}
                  onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                  placeholder="e.g. Handmade Truffle Gnocchi"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <input
                    type="text"
                    value={newDish.category}
                    onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                    placeholder="Pasta / Curry"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDish.base_price}
                    onChange={(e) => setNewDish({ ...newDish, base_price: e.target.value })}
                    placeholder="22.50"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Daily Stock Portions (Chef Morning Target)</label>
                <input
                  type="number"
                  value={newDish.daily_stock}
                  onChange={(e) => setNewDish({ ...newDish, daily_stock: e.target.value })}
                  placeholder="20"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-bold"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Number of portions Chef can prepare today. Auto-depletes when orders arrive.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Food Image URL</label>
                <input
                  type="url"
                  value={newDish.image_url}
                  onChange={(e) => setNewDish({ ...newDish, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
                
                {/* Image Quick Presets */}
                <div className="space-y-1 mt-2">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">Quick Food Image Presets:</span>
                  <div className="flex flex-wrap gap-1">
                    {presetImages.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewDish({ ...newDish, image_url: p.url })}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300 dark:border-slate-700"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows="2"
                  value={newDish.description}
                  onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                  placeholder="Brief dish description..."
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial Stock Availability</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="newDishStock"
                      checked={newDish.is_available === true}
                      onChange={() => setNewDish({ ...newDish, is_available: true })}
                      className="accent-emerald-500"
                    />
                    <span>🟢 In Stock</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="newDishStock"
                      checked={newDish.is_available === false}
                      onChange={() => setNewDish({ ...newDish, is_available: false })}
                      className="accent-rose-500"
                    />
                    <span>🔴 Out of Stock</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                + Save New Dish (MySQL & MongoDB)
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Edit Dish Modal Window */}
      {editingDish && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-300 dark:border-slate-800 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Edit Dish #{editForm.dish_id}
              </h3>
              <button onClick={() => setEditingDish(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDish} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Dish Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.base_price}
                    onChange={(e) => setEditForm({ ...editForm, base_price: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Daily Stock Portions (Chef Morning Target)</label>
                <input
                  type="number"
                  value={editForm.daily_stock}
                  onChange={(e) => setEditForm({ ...editForm, daily_stock: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500 font-bold"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Update available portions for today's kitchen menu.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Food Image URL</label>
                <input
                  type="url"
                  value={editForm.image_url}
                  onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />

                {/* Quick Presets */}
                <div className="space-y-1 mt-2">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">Quick Food Image Presets:</span>
                  <div className="flex flex-wrap gap-1">
                    {presetImages.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, image_url: p.url })}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300 dark:border-slate-700"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows="2"
                  value={newDish.description}
                  onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                  placeholder="Brief dish description..."
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial Stock Availability</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="newDishStock"
                      checked={newDish.is_available === true}
                      onChange={() => setNewDish({ ...newDish, is_available: true })}
                      className="accent-emerald-500"
                    />
                    <span>🟢 In Stock</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="newDishStock"
                      checked={newDish.is_available === false}
                      onChange={() => setNewDish({ ...newDish, is_available: false })}
                      className="accent-rose-500"
                    />
                    <span>🔴 Out of Stock</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                + Save New Dish (MySQL & MongoDB)
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Edit Dish Modal Window */}
      {editingDish && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-300 dark:border-slate-800 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Edit Dish #{editForm.dish_id}
              </h3>
              <button onClick={() => setEditingDish(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDish} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Dish Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.base_price}
                    onChange={(e) => setEditForm({ ...editForm, base_price: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Food Image URL</label>
                <input
                  type="url"
                  value={editForm.image_url}
                  onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />

                {/* Quick Presets */}
                <div className="space-y-1 mt-2">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">Quick Food Image Presets:</span>
                  <div className="flex flex-wrap gap-1">
                    {presetImages.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, image_url: p.url })}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300 dark:border-slate-700"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Stock Availability Status</label>
                <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-800">
                  <label className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-extrabold cursor-pointer">
                    <input
                      type="radio"
                      name="editDishStock"
                      checked={editForm.is_available === true}
                      onChange={() => setEditForm({ ...editForm, is_available: true })}
                      className="accent-emerald-500"
                    />
                    <span>🟢 In Stock (Available for Order)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-extrabold cursor-pointer">
                    <input
                      type="radio"
                      name="editDishStock"
                      checked={editForm.is_available === false}
                      onChange={() => setEditForm({ ...editForm, is_available: false })}
                      className="accent-rose-500"
                    />
                    <span>🔴 Out of Stock</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Out-of-Stock Reason (Customer Portal Banner Display)
                </label>
                
                {/* Preset Pills GUI */}
                <div className="mb-2 flex flex-wrap gap-1.5">
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
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                        editForm.out_of_stock_reason === preset
                          ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-amber-500/50'
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDish(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  Update Dish Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Kitchen Orders Queue */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Kitchen Order Display System (KDS)</h2>
          {orders.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-12 glass-card rounded-2xl">No incoming orders in queue.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((o) => (
                <div key={o.order_id} className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">Order #{o.order_id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.status === 'READY' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                        o.status === 'PREPARING' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                        'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                      }`}>
                        {o.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <p>Customer: <strong className="text-slate-900 dark:text-slate-200">{o.customer_name}</strong> ({o.customer_phone})</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">{new Date(o.timestamp).toLocaleString()}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-300 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">Items Ordered:</span>
                      {o.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 p-2 rounded-lg border border-slate-300 dark:border-slate-800">
                          <span>{item.dish_name}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    {o.status === 'PLACED' && (
                      <button
                        onClick={() => updateOrderStatus(o.order_id, 'PREPARING')}
                        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md"
                      >
                        Accept & Start Prep
                      </button>
                    )}
                    {o.status === 'PREPARING' && (
                      <button
                        onClick={() => updateOrderStatus(o.order_id, 'READY')}
                        className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow-md"
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
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-3">Relational Ingredient Stock Inventory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Ingredient</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Reorder Threshold</th>
                    <th className="p-3 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 dark:divide-slate-800/60">
                  {inventory.map((inv) => {
                    const isLow = Number(inv.stock_quantity) <= Number(inv.reorder_level);
                    return (
                      <tr key={inv.ingredient_id} className="hover:bg-slate-100 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{inv.ingredient_name}</td>
                        <td className="p-3">
                          <span className={`font-mono font-extrabold px-2 py-0.5 rounded-md ${
                            isLow ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {parseFloat(Number(inv.stock_quantity).toFixed(2))} {inv.unit}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{parseFloat(Number(inv.reorder_level).toFixed(2))} {inv.unit}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditIngredientModal(inv)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 font-bold text-[11px] transition-all flex items-center gap-1"
                              title="Edit ingredient stock or reorder alert"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(inv.ingredient_id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-[11px] transition-all flex items-center gap-1"
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
          <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-3">+ Add / Restock Ingredient</h3>
            <form onSubmit={handleAddIngredient} className="space-y-4 text-xs">
              
              {/* Standardized Ingredient Dropdown */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Standardized Ingredient Selector</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) setNewIngredient({ ...newIngredient, ingredient_name: e.target.value });
                  }}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-medium"
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
                <p className="text-[10px] text-slate-500 mt-1">Prevents database casing inconsistencies (e.g. 'truffle oil' vs 'Truffle Oil').</p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Ingredient Name (Title Case)</label>
                <input
                  type="text"
                  value={newIngredient.ingredient_name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, ingredient_name: e.target.value })}
                  placeholder="e.g. Truffle Oil"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Stock Qty</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newIngredient.stock_quantity}
                    onChange={(e) => setNewIngredient({ ...newIngredient, stock_quantity: e.target.value })}
                    placeholder="50"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Unit</label>
                  <input
                    type="text"
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                    placeholder="liters / kg / units"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Reorder Alert Level</label>
                <input
                  type="number"
                  step="0.1"
                  value={newIngredient.reorder_level}
                  onChange={(e) => setNewIngredient({ ...newIngredient, reorder_level: e.target.value })}
                  placeholder="5"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-lg"
              >
                Save Ingredient Stock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ingredient Modal */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-300 dark:border-slate-800 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Edit Ingredient #{editIngredientForm.ingredient_id}
              </h3>
              <button onClick={() => setEditingIngredient(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditIngredient} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Ingredient Name</label>
                <input
                  type="text"
                  value={editIngredientForm.ingredient_name}
                  onChange={(e) => setEditIngredientForm({ ...editIngredientForm, ingredient_name: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Current Stock Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editIngredientForm.stock_quantity}
                    onChange={(e) => setEditIngredientForm({ ...editIngredientForm, stock_quantity: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Unit</label>
                  <input
                    type="text"
                    value={editIngredientForm.unit}
                    onChange={(e) => setEditIngredientForm({ ...editIngredientForm, unit: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Reorder Alert Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={editIngredientForm.reorder_level}
                  onChange={(e) => setEditIngredientForm({ ...editIngredientForm, reorder_level: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500 font-bold"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
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
            <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Organized Dish Recipe Cards</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">All required ingredients consolidated under each single recipe name</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                {dishes.length} Dish Recipes
              </span>
            </div>

            {/* Grouped Dish Recipe Cards */}
            <div className="space-y-4">
              {dishes.map((dish) => {
                const dishRecipes = recipes.filter(r => Number(r.dish_id) === Number(dish.dish_id));
                return (
                  <div key={dish.dish_id} className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-3 shadow-lg">
                    <div className="flex flex-wrap justify-between items-center border-b border-slate-300 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{dish.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                          ${Number(dish.base_price).toFixed(2)}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        {dishRecipes.length} Ingredient{dishRecipes.length !== 1 ? 's' : ''} Mapped
                      </span>
                    </div>

                    {dishRecipes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No ingredient links mapped for this dish yet. Map ingredients using the form on the right.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-900/60 text-slate-500 text-[10px] uppercase font-bold">
                            <tr>
                              <th className="p-2.5 rounded-l-lg">Required Ingredient</th>
                              <th className="p-2.5">Portion Quantity</th>
                              <th className="p-2.5 rounded-r-lg text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300 dark:divide-slate-800/40">
                            {dishRecipes.map((r) => (
                              <tr key={r.recipe_id} className="hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">{r.ingredient_name}</td>
                                <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">
                                  {parseFloat(Number(r.quantity_required).toFixed(2))} {r.unit}
                                </td>
                                <td className="p-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => openEditRecipeModal(r)}
                                      className="px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 font-bold text-[10px] transition-all flex items-center gap-1"
                                      title="Edit portion quantity required for recipe"
                                    >
                                      <Edit3 className="w-3 h-3" /> Edit Qty
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecipe(r.recipe_id)}
                                      className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold text-[10px] transition-all flex items-center gap-1"
                                      title="Remove ingredient link from dish recipe"
                                    >
                                      <Trash2 className="w-3 h-3" /> Remove Link
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
          <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4 h-fit sticky top-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-3">+ Map Dish to Ingredient</h3>
            <form onSubmit={handleAddRecipe} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Select Dish Recipe</label>
                <select
                  value={newRecipe.dish_id}
                  onChange={(e) => setNewRecipe({ ...newRecipe, dish_id: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-bold"
                  required
                >
                  <option value="">-- Choose Dish --</option>
                  {dishes.map((d) => (
                    <option key={d.dish_id} value={d.dish_id}>{d.name} (${Number(d.base_price).toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Select Ingredient</label>
                <select
                  value={newRecipe.ingredient_id}
                  onChange={(e) => setNewRecipe({ ...newRecipe, ingredient_id: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-bold"
                  required
                >
                  <option value="">-- Choose Ingredient --</option>
                  {inventory.map((inv) => (
                    <option key={inv.ingredient_id} value={inv.ingredient_id}>{inv.ingredient_name} ({parseFloat(Number(inv.stock_quantity).toFixed(2))} {inv.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Quantity Required per Portion</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRecipe.quantity_required}
                  onChange={(e) => setNewRecipe({ ...newRecipe, quantity_required: e.target.value })}
                  placeholder="e.g. 0.25"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-lg"
              >
                Save Recipe Junction Link
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Recipe Portion Modal */}
      {editingRecipe && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-300 dark:border-slate-800 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Edit Recipe Portion Quantity
              </h3>
              <button onClick={() => setEditingRecipe(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRecipe} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Dish Name</label>
                <input
                  type="text"
                  value={editRecipeForm.dish_name}
                  disabled
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Required Ingredient</label>
                <input
                  type="text"
                  value={editRecipeForm.ingredient_name}
                  disabled
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Quantity Required per Portion ({editRecipeForm.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={editRecipeForm.quantity_required}
                  onChange={(e) => setEditRecipeForm({ ...editRecipeForm, quantity_required: e.target.value })}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500 font-bold"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRecipe(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
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
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Chef Net Revenue (85% Split)</span>
              <h2 className="text-3xl font-black text-emerald-400">${payouts.total_earned}</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              Direct Escrow Payouts Active
            </span>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-3">Escrow Payout Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Payout ID</th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Order Status</th>
                    <th className="p-3">Chef 85% Split</th>
                    <th className="p-3 rounded-r-xl">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 dark:divide-slate-800/60">
                  {payouts.payouts?.map((p) => (
                    <tr key={p.payout_id} className="hover:bg-slate-100 dark:hover:bg-slate-900/40">
                      <td className="p-3 font-mono text-slate-500">#{p.payout_id}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Order #{p.order_id}</td>
                      <td className="p-3"><span className="text-emerald-600 dark:text-emerald-400 font-bold">{p.order_status}</span></td>
                      <td className="p-3 font-black text-emerald-600 dark:text-emerald-400">${Number(p.vendor_amount).toFixed(2)}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{new Date(p.executed_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Customer Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">⭐ Kitchen Customer Ratings & Feedback</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time reviews and NLP sentiment scoring from verified customers</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                {chefReviews.length} Verified Customer Reviews
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chefReviews.map((r, i) => (
                <div key={r.review_id || i} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{r.customer_name || 'Customer'}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Order #{r.order_id}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      r.sentiment_label === 'POSITIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {r.sentiment_label || 'POSITIVE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-amber-500">
                    <span>Chef Rating: {'⭐'.repeat(r.vendor_rating || 5)}</span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-200/50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700/50">
                    "{r.comment || 'Delicious meal!'}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
