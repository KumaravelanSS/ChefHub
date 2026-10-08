import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag, Star, Clock, MapPin, CheckCircle2, ChevronRight, ChevronLeft,
  X, AlertCircle, AlertTriangle, Sparkles, Send, Ban, Utensils, Flame, Heart,
  Search, Filter, Eye, EyeOff, CreditCard, ShieldCheck, Lock, Receipt, ArrowRight,
  Truck, QrCode, Building, Wallet, Download, RefreshCw, Tag, Percent, Navigation,
  Compass, ChefHat, Check, Info, SlidersHorizontal, ArrowUpDown, Plus,
  Trash2, MapPinOff, Smartphone, Home, Briefcase, User, Phone, CheckCircle, KeyRound, Radio
} from 'lucide-react';
import { KitchenLoadingScreen } from '../components/KitchenLoading';
import CustomerAuthPage from './CustomerAuthPage';
import LiveDeliveryMap from '../components/LiveDeliveryMap';

const DELIVERY_FEE = 40.00;

const fallbackImages = {
  'Signature Truffle Tagliatelle': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
  'Handmade Parmigiano Ravioli': 'https://images.unsplash.com/photo-1587740896339-96a761e0508d?auto=format&fit=crop&w=600&q=80',
  'Wild Mushroom Truffle Gnocchi': 'https://images.unsplash.com/photo-1621996346565-e3d5d6281313?auto=format&fit=crop&w=600&q=80',
  'Truffle Burrata Flatbread': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
  'Classic Garlic Herb Focaccia': 'https://images.unsplash.com/photo-1579684947550-22e945225d9a?auto=format&fit=crop&w=600&q=80',
  'Traditional Espresso Tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
  'Shahi Paneer Tikka Masala': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
  'Slow-Cooked Butter Chicken': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
  'Aromatic Royal Dum Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
  'Garlic Butter Naan (2 pcs)': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
  'Chilled Mango Lassi Smoothie': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
  'Rich Tonkotsu Pork Ramen': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  'Crispy Chicken Katsu Curry Bowl': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  'Pan-Seared Pork Gyoza (6 pcs)': 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
  'Chettinad Pepper Chicken': 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80',
  'Madras Ghee Roast Dosa': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80'
};

const getDishImage = (dish) => {
  if (dish.image_url) return dish.image_url;
  if (fallbackImages[dish.name]) return fallbackImages[dish.name];
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
};

const CHEF_AVATARS = {
  'chef.mario@chefhub.com': {
    name: 'Chef Mario Rossi',
    title: 'Michelin Artisan • Italian',
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=240&q=80',
    locality: 'Indiranagar 100ft Rd',
    coords: { lat: 12.9784, lng: 77.6408 }
  },
  'chef.priya@chefhub.com': {
    name: 'Chef Priya Sharma',
    title: 'Royal Mughal & Lucknowi',
    avatar: 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&w=240&q=80',
    locality: 'Koramangala 5th Block',
    coords: { lat: 12.9352, lng: 77.6245 }
  },
  'chef.kenji@chefhub.com': {
    name: 'Chef Kenji Sato',
    title: 'Tokyo Ramen Master',
    avatar: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=240&q=80',
    locality: 'MG Road, Church Street',
    coords: { lat: 12.9756, lng: 77.6066 }
  },
  'chef.ramu@chefhub.com': {
    name: 'Chef Ramu Pillai',
    title: 'Chettinad Heritage Master',
    avatar: 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?auto=format&fit=crop&w=240&q=80',
    locality: 'HSR Layout Sector 1',
    coords: { lat: 12.9121, lng: 77.6446 }
  }
};

const BANGALORE_HUBS = [
  { id: 'koramangala', name: 'Koramangala 5th Block', lat: 12.9352, lng: 77.6245, desc: 'Central Gourmet Hub • ~2.1 km to Priya' },
  { id: 'indiranagar', name: 'Indiranagar 100ft Road', lat: 12.9784, lng: 77.6408, desc: 'Italian & Fusion Hub • ~1.5 km to Mario' },
  { id: 'mgroad', name: 'MG Road / UB City', lat: 12.9716, lng: 77.5946, desc: 'Tokyo Ramen Hub • ~1.2 km to Kenji' },
  { id: 'hsr', name: 'HSR Layout Sector 4', lat: 12.9121, lng: 77.6446, desc: 'Chettinad Hub • ~1.0 km to Ramu' },
  { id: 'whitefield', name: 'Whitefield ITPL', lat: 12.9863, lng: 77.7337, desc: 'Tech Corridor • ~14.2 km (Within 20 km)' },
  { id: 'airport', name: 'Kempegowda Airport (BLR)', lat: 13.2400, lng: 77.7100, desc: 'Airport Zone • ~34.8 km (>20 km Limit Test)' }
];

const CUISINE_ITEMS = [
  { id: 'ALL', name: 'All Dishes', icon: '🍽️', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=240&q=80' },
  { id: 'Biryani', name: 'Biryani & Rice', icon: '🍛', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=240&q=80' },
  { id: 'Pasta', name: 'Artisan Pasta', icon: '🍝', img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=240&q=80' },
  { id: 'Ramen', name: 'Tokyo Ramen', icon: '🍜', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=240&q=80' },
  { id: 'Chettinad', name: 'Chettinad & Dosa', icon: '🥘', img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=240&q=80' },
  { id: 'Flatbread', name: 'Burrata Flatbread', icon: '🍕', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=240&q=80' },
  { id: 'Curry', name: 'Butter Chicken & Tikka', icon: '🍲', img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=240&q=80' },
  { id: 'Desserts', name: 'Tiramisu & Sweets', icon: '🍰', img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=240&q=80' }
];

const PROMO_CHIPS = [
  { code: 'CHEF50', title: '₹50 OFF', desc: 'Flat ₹50 OFF min ₹199' },
  { code: 'GOURMET20', title: '20% OFF', desc: 'Up to ₹120 OFF min ₹350' },
  { code: 'FIRSTBITE', title: '₹75 OFF', desc: 'Welcome bonus min ₹249' },
  { code: 'FREESHIP', title: 'FREE DELIVERY', desc: 'Zero delivery fee' }
];

export default function CustomerSite({ user, onLogin, onLogout }) {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedChefFilter, setSelectedChefFilter] = useState('ALL'); // 'ALL' or vendor_id
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  
  // Default Customer Addresses
  const DEFAULT_SAVED_ADDRESSES = [
    {
      id: 'addr_koramangala',
      tag: 'Home',
      recipient_name: user?.name || 'Alex Customer',
      phone: '9845012890',
      flat_street: 'Flat 402, Prestige Oasis, 1st Cross, 5th Block',
      locality: 'Koramangala 5th Block',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560034',
      lat: 12.9352,
      lng: 77.6245
    },
    {
      id: 'addr_indiranagar',
      tag: 'Work',
      recipient_name: user?.name || 'Alex Customer',
      phone: '9845012890',
      flat_street: 'Suite 204, Embassy Golf Links, Intermediate Ring Rd',
      locality: 'Indiranagar 100ft Road',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560071',
      lat: 12.9784,
      lng: 77.6408
    }
  ];

  // Delivery Address & Multi-Address Management State
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      const saved = localStorage.getItem('chefhub_customer_addresses');
      return saved ? JSON.parse(saved) : DEFAULT_SAVED_ADDRESSES;
    } catch {
      return DEFAULT_SAVED_ADDRESSES;
    }
  });

  const [primaryAddress, setPrimaryAddress] = useState(() => {
    if (user?.primary_address) return user.primary_address;
    try {
      const saved = localStorage.getItem('chefhub_customer_addresses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          const first = parsed[0];
          return `${first.flat_street}, ${first.locality}, ${first.district}, ${first.state} - ${first.pincode}`;
        }
      }
    } catch {}
    return 'Flat 402, Prestige Oasis, Koramangala 5th Block, Bengaluru';
  });

  const [currentCoords, setCurrentCoords] = useState(() => {
    if (user?.latitude && user?.longitude) {
      return { lat: Number(user.latitude), lng: Number(user.longitude), locality: 'Current Location' };
    }
    try {
      const saved = localStorage.getItem('chefhub_customer_addresses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && parsed[0].lat) {
          return { lat: Number(parsed[0].lat), lng: Number(parsed[0].lng), locality: parsed[0].locality };
        }
      }
    } catch {}
    return { lat: 12.9352, lng: 77.6245, locality: 'Koramangala 5th Block' };
  });

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInputText, setAddressInputText] = useState(primaryAddress);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressFeedback, setAddressFeedback] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    tag: 'Home',
    recipient_name: user?.name || 'Alex Customer',
    phone: '9845012890',
    flat_street: '',
    locality: 'Koramangala 5th Block',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    pincode: '560034',
    selectedHubId: 'koramangala'
  });

  // Default Saved Cards (RBI Tokenization compliant)
  const DEFAULT_SAVED_CARDS = [
    {
      id: 'card_hdfc_8821',
      bank: 'HDFC Regalia',
      brand: 'Visa',
      last4: '8821',
      holder: user?.name || 'Alex Customer',
      exp: '08/29',
      cardNumber: '4532 8892 1042 8821',
      cvv: '888'
    },
    {
      id: 'card_icici_4242',
      bank: 'ICICI Coral',
      brand: 'Mastercard',
      last4: '4242',
      holder: user?.name || 'Alex Customer',
      exp: '12/28',
      cardNumber: '5241 6610 9920 4242',
      cvv: '712'
    }
  ];

  const [savedCards, setSavedCards] = useState(() => {
    try {
      const saved = localStorage.getItem('chefhub_saved_cards');
      return saved ? JSON.parse(saved) : DEFAULT_SAVED_CARDS;
    } catch {
      return DEFAULT_SAVED_CARDS;
    }
  });
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardInput, setNewCardInput] = useState({
    bank: 'HDFC Bank',
    brand: 'Visa',
    cardNumber: '',
    holder: user?.name || 'Alex Customer',
    exp: '',
    cvv: ''
  });

  // Guest Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 20km Radius enforcement toggle
  const [enforceRadius, setEnforceRadius] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('ALL');
  const [selectedDiet, setSelectedDiet] = useState('ALL'); // 'ALL' | 'VEGAN' | 'SPICY' | 'FAVORITES'
  const [vegOnly, setVegOnly] = useState(false);
  const [serviceType, setServiceType] = useState('DELIVERY'); // 'DELIVERY' | 'PICKUP'
  const [sortBy, setSortBy] = useState('RECOMMENDED'); // 'RECOMMENDED' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING'
  const [favorites, setFavorites] = useState(new Set());
  const [addedFeedback, setAddedFeedback] = useState({});
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Payment Gateway & Order Confirmation States
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [paymentStage, setPaymentStage] = useState('IDLE'); // 'IDLE' | 'PROCESSING' | 'SUCCESS_ANIM' | 'FAILED_ANIM'
  const [paymentStageData, setPaymentStageData] = useState(null);
  const [simulateFail, setSimulateFail] = useState(false);
  const [merchantTransactionView, setMerchantTransactionView] = useState(null);

  // Strict Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponStatus, setCouponStatus] = useState({ state: 'IDLE', message: '' });

  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'CARD', // 'CARD' | 'UPI' | 'NETBANKING' | 'ESCROW_WALLET'
    cardHolder: user?.name || 'Alex Customer',
    cardNumber: '4532 8892 1042 8821',
    expiry: '08/29',
    cvv: '888',
    upiApp: 'gpay', // 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'custom'
    upiId: 'alex.customer@oksbi',
    isUpiVerified: true,
    bankName: 'HDFC Bank',
    deliveryNotes: 'Leave at doorstep, ring bell once'
  });

  // Escrow Wallet State & Top-Up
  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('chefhub_wallet_balance');
      return saved ? parseFloat(saved) : 1250.00;
    } catch {
      return 1250.00;
    }
  });
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [topUpAmountInput, setTopUpAmountInput] = useState('500');
  const [topUpMethod, setTopUpMethod] = useState('UPI');
  const [isAddingMoney, setIsAddingMoney] = useState(false);
  const [addMoneySuccess, setAddMoneySuccess] = useState('');

  // Top-Up Payment Details
  const [topUpCardDetails, setTopUpCardDetails] = useState({
    selectedCardId: 'card_hdfc_8821',
    isNewCard: false,
    cardNumber: '',
    cardHolder: user?.name || 'Alex Customer',
    expiry: '',
    cvv: '',
    bankName: 'HDFC Bank',
    saveForFuture: true
  });
  const [topUpUpiDetails, setTopUpUpiDetails] = useState({
    upiApp: 'gpay', // 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'cred' | 'custom'
    upiId: 'alex.customer@okhdfcbank',
    isVerified: true,
    showQr: false
  });
  const [topUpNetBankingDetails, setTopUpNetBankingDetails] = useState({
    bankName: 'HDFC Bank'
  });
  // 3D-Secure 2FA / OTP Verification Modal for Top-Up
  const [topUpOtpModal, setTopUpOtpModal] = useState({
    isOpen: false,
    amount: 0,
    method: 'UPI',
    referenceId: '',
    otpInput: '123456',
    generatedOtp: '123456',
    isVerifying: false,
    error: ''
  });

  // Interactive Star Ratings (1-5)
  const [vendorRating, setVendorRating] = useState(5);
  const [riderRating, setRiderRating] = useState(5);
  const [hoverVendorRating, setHoverVendorRating] = useState(0);
  const [hoverRiderRating, setHoverRiderRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const [orderStatusMsg, setOrderStatusMsg] = useState('');
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Top Customer View Switcher (Marketplace vs My Orders)
  const [customerTab, setCustomerTab] = useState('MARKETPLACE'); // 'MARKETPLACE' | 'ORDERS'
  const [ordersFilter, setOrdersFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'
  const [timelineAnimKey, setTimelineAnimKey] = useState(0);
  const menuSectionRef = useRef(null);
  const cuisineScrollRef = useRef(null);

  // Animated sliding indicators
  const [customerTabIndicator, setCustomerTabIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const customerTabRefs = useRef({});

  const updateCustomerTabIndicator = () => {
    if (customerTabRefs.current[customerTab]) {
      const el = customerTabRefs.current[customerTab];
      if (el && el.offsetWidth > 0) {
        setCustomerTabIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1
        });
      }
    }
  };

  useEffect(() => {
    updateCustomerTabIndicator();
    const t = setTimeout(updateCustomerTabIndicator, 60);
    return () => clearTimeout(t);
  }, [customerTab, myOrders.length]);

  const [filterIndicator, setFilterIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const filterTabRefs = useRef({});

  const updateFilterIndicator = () => {
    if (filterTabRefs.current[selectedDiet]) {
      const el = filterTabRefs.current[selectedDiet];
      if (el && el.offsetWidth > 0) {
        setFilterIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1
        });
      }
    }
  };

  useEffect(() => {
    updateFilterIndicator();
    const t1 = setTimeout(updateFilterIndicator, 60);
    return () => clearTimeout(t1);
  }, [selectedDiet, favorites.size]);

  // Active in-flight request tracking, AbortController & deduplication
  const abortControllerRef = useRef(null);
  const inFlightFetchRef = useRef(null);
  const lastFetchMetaRef = useRef({ lat: null, lng: null, time: 0 });
  const currentCoordsRef = useRef(currentCoords);
  const sseDebounceTimerRef = useRef(null);

  // Keep coords ref synced
  useEffect(() => {
    currentCoordsRef.current = currentCoords;
  }, [currentCoords]);

  // Fetch Vendors with dynamic location calculation, AbortController & Deduplication
  const fetchVendors = async (coords = currentCoordsRef.current, force = false) => {
    const targetLat = coords?.lat !== undefined ? Number(coords.lat) : 12.9352;
    const targetLng = coords?.lng !== undefined ? Number(coords.lng) : 77.6245;

    // Deduplication check: if identical coordinates fetched within 3.5 seconds and not forced, reuse existing promise
    const now = Date.now();
    const isSameLocation =
      lastFetchMetaRef.current.lat !== null &&
      Math.abs(lastFetchMetaRef.current.lat - targetLat) < 0.0001 &&
      Math.abs(lastFetchMetaRef.current.lng - targetLng) < 0.0001;

    if (!force) {
      if (isSameLocation && now - lastFetchMetaRef.current.time < 3500) {
        if (inFlightFetchRef.current) return inFlightFetchRef.current;
        return; // Already resolved recently with same coordinates, skip redundant network call
      }
      if (inFlightFetchRef.current && isSameLocation) {
        return inFlightFetchRef.current;
      }
    }

    // Cancel any previous in-flight request to avoid race conditions and queued pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/customer/vendors?lat=${targetLat}&lng=${targetLng}&enforce_radius=false`, {
          signal: controller.signal
        });

        if (!res.ok && res.status !== 304) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.vendors)) {
          setVendors(data.vendors);
          setSelectedVendor((prev) => {
            if (!prev) return data.vendors[0] ? { ...data.vendors[0], menu: { ...data.vendors[0].menu } } : null;
            const match = data.vendors.find((v) => v.vendor_id === prev.vendor_id);
            return match ? { ...match, menu: { ...match.menu } } : (data.vendors[0] ? { ...data.vendors[0], menu: { ...data.vendors[0].menu } } : null);
          });
          lastFetchMetaRef.current = { lat: targetLat, lng: targetLng, time: Date.now() };
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // Expected when a newer request or unmount occurs, do nothing
          return;
        }
        console.error('Fetch vendors error:', err);
      } finally {
        if (abortControllerRef.current === controller) {
          setLoadingVendors(false);
          inFlightFetchRef.current = null;
        }
      }
    })();

    inFlightFetchRef.current = fetchPromise;
    return fetchPromise;
  };

  const fetchMyOrders = async () => {
    try {
      const token = localStorage.getItem('chefhub_token');
      if (!token) return;
      const res = await fetch('/api/customer/my-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setMyOrders(data.orders);
    } catch (err) {
      console.error('Fetch my orders error:', err);
    }
  };

  // Coalesce / debounce rapid bursts of real-time events (e.g. from SSE)
  const triggerDebouncedVendorRefresh = () => {
    if (sseDebounceTimerRef.current) clearTimeout(sseDebounceTimerRef.current);
    sseDebounceTimerRef.current = setTimeout(() => {
      fetchVendors(currentCoordsRef.current, true);
    }, 1500);
  };

  // 1. Stabilize user profile address/coords changes without triggering unnecessary renders
  useEffect(() => {
    if (user?.primary_address) {
      setPrimaryAddress(prev => prev === user.primary_address ? prev : user.primary_address);
      setAddressInputText(prev => prev === user.primary_address ? prev : user.primary_address);
    }
    if (user?.latitude && user?.longitude) {
      const uLat = Number(user.latitude);
      const uLng = Number(user.longitude);
      setCurrentCoords(prev => {
        if (Math.abs(prev.lat - uLat) < 0.0001 && Math.abs(prev.lng - uLng) < 0.0001) {
          return prev;
        }
        return {
          lat: uLat,
          lng: uLng,
          locality: prev.locality
        };
      });
    }
  }, [user?.primary_address, user?.latitude, user?.longitude]);

  // 2. Initial & Location-change Fetch: strictly dependent on primitive lat/lng coordinates
  useEffect(() => {
    fetchVendors({ lat: currentCoords.lat, lng: currentCoords.lng });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentCoords.lat, currentCoords.lng]);

  // 3. User Orders & Wallet Sync: strictly dependent on user authentication state
  useEffect(() => {
    if (user && user.role === 'CUSTOMER') {
      fetchMyOrders();
      fetchWalletBalance();
    }
  }, [user?.user_id, user?.role]);

  // 4. Server-Sent Events push stream & conservative background polling (active only for authenticated customers)
  useEffect(() => {
    if (!user || user.role !== 'CUSTOMER') return;

    let eventSource = null;
    try {
      const token = localStorage.getItem('chefhub_token');
      const url = token ? `/api/realtime/events?channel=global&token=${encodeURIComponent(token)}` : '/api/realtime/events?channel=global';
      eventSource = new EventSource(url);

      eventSource.addEventListener('DISH_STOCK_UPDATED', () => {
        triggerDebouncedVendorRefresh();
      });
      eventSource.addEventListener('ORDER_CREATED', () => {
        fetchMyOrders();
        fetchWalletBalance();
        triggerDebouncedVendorRefresh();
      });
      eventSource.addEventListener('ORDER_STATUS_CHANGED', () => {
        fetchMyOrders();
        fetchWalletBalance();
      });
      eventSource.addEventListener('ORDER_CANCELLED', () => {
        fetchMyOrders();
        fetchWalletBalance();
        triggerDebouncedVendorRefresh();
      });
    } catch (e) {
      console.warn('Realtime SSE connection fallback:', e);
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchVendors(currentCoordsRef.current, false);
        fetchMyOrders();
        fetchWalletBalance();
      }
    }, 30000);

    return () => {
      if (eventSource) eventSource.close();
      if (sseDebounceTimerRef.current) clearTimeout(sseDebounceTimerRef.current);
      clearInterval(interval);
    };
  }, [user?.user_id]);

  // Fetch Customer Wallet Balance
  const fetchWalletBalance = async () => {
    try {
      const token = localStorage.getItem('chefhub_token');
      if (!token) return;
      const res = await fetch('/api/customer/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.balance !== undefined) {
        setWalletBalance(Number(data.balance));
        localStorage.setItem('chefhub_wallet_balance', String(data.balance));
      }
    } catch (e) {
      console.warn('Wallet fetch fallback:', e.message);
    }
  };

  // --- SAVED CARDS MANAGEMENT (RBI Compliant) ---
  const handleRemoveCard = (cardId) => {
    if (savedCards.length <= 1) {
      if (!confirm('You are removing your last saved card. Under RBI regulations, you will need to re-enter card details for subsequent transactions. Remove card?')) {
        return;
      }
    } else {
      if (!confirm('Remove this saved card? Under RBI storage guidelines, its credentials will be permanently erased.')) {
        return;
      }
    }
    const updated = savedCards.filter(c => c.id !== cardId);
    setSavedCards(updated);
    localStorage.setItem('chefhub_saved_cards', JSON.stringify(updated));
    if (topUpCardDetails.selectedCardId === cardId && updated.length > 0) {
      setTopUpCardDetails(prev => ({ ...prev, selectedCardId: updated[0].id }));
    }
  };

  const handleSaveNewCard = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawNum = newCardInput.cardNumber.replace(/\s+/g, '');
    if (rawNum.length < 15 || rawNum.length > 19) {
      alert('Please enter a valid 16-digit card number.');
      return;
    }
    if (!newCardInput.holder.trim()) {
      alert('Please enter cardholder name as printed on card.');
      return;
    }
    if (!newCardInput.exp || !newCardInput.exp.includes('/') || newCardInput.exp.length < 5) {
      alert('Please enter valid expiry date (MM/YY).');
      return;
    }
    if (!newCardInput.cvv || newCardInput.cvv.length < 3) {
      alert('Please enter a 3 or 4-digit CVV / security code.');
      return;
    }

    const cardId = 'card_' + Date.now().toString().slice(-6);
    const last4 = rawNum.slice(-4);
    const brand = rawNum.startsWith('4') ? 'Visa' : rawNum.startsWith('5') ? 'Mastercard' : 'RuPay';
    const bankName = newCardInput.bank || (brand + ' Bank Card');

    const createdCard = {
      id: cardId,
      bank: bankName,
      brand,
      last4,
      holder: newCardInput.holder.trim(),
      exp: newCardInput.exp,
      cardNumber: `${rawNum.slice(0, 4)} •••• •••• ${last4}`,
      cvv: newCardInput.cvv
    };

    const updated = [...savedCards, createdCard];
    setSavedCards(updated);
    localStorage.setItem('chefhub_saved_cards', JSON.stringify(updated));
    setPaymentForm(prev => ({
      ...prev,
      cardNumber: `${rawNum.slice(0, 4)} ${rawNum.slice(4, 8)} ${rawNum.slice(8, 12)} ${last4}`,
      cardHolder: newCardInput.holder.trim(),
      expiry: newCardInput.exp,
      cvv: newCardInput.cvv
    }));
    setTopUpCardDetails(prev => ({
      ...prev,
      selectedCardId: cardId,
      isNewCard: false
    }));
    setShowAddCardModal(false);
    setNewCardInput({
      bank: 'HDFC Bank',
      brand: 'Visa',
      cardNumber: '',
      holder: user?.name || 'Alex Customer',
      exp: '',
      cvv: ''
    });
    alert('✅ New card saved securely under RBI tokenization guidelines!');
  };

  // --- SAVED ADDRESSES MANAGEMENT ---
  const handleSelectSavedAddress = (addr) => {
    const formatted = `${addr.flat_street}, ${addr.locality}, ${addr.district}, ${addr.state} - ${addr.pincode}`;
    setPrimaryAddress(formatted);
    setAddressInputText(formatted);
    const newCoords = {
      lat: addr.lat || 12.9352,
      lng: addr.lng || 77.6245,
      locality: addr.locality
    };
    setCurrentCoords(newCoords);
    fetchVendors(newCoords, true);
    setShowAddressModal(false);
    setAddressFeedback(`📍 Delivering to ${addr.tag} (${addr.locality})!`);
    setTimeout(() => setAddressFeedback(''), 2500);
  };

  const handleRemoveAddress = (addrId) => {
    if (savedAddresses.length <= 1) {
      alert('You must have at least one delivery address in your account.');
      return;
    }
    if (!confirm('Are you sure you want to delete this address?')) return;
    const updated = savedAddresses.filter(a => a.id !== addrId);
    setSavedAddresses(updated);
    localStorage.setItem('chefhub_customer_addresses', JSON.stringify(updated));
  };

  const handleSaveNewAddress = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newAddressForm.recipient_name.trim()) {
      alert('Please enter recipient customer name.');
      return;
    }
    const cleanPhone = newAddressForm.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile contact number.');
      return;
    }
    if (!newAddressForm.flat_street.trim() || newAddressForm.flat_street.trim().length < 5) {
      alert('Please provide complete house/flat number, building, and street name.');
      return;
    }
    if (!newAddressForm.pincode || newAddressForm.pincode.length < 6) {
      alert('Please enter a valid 6-digit PIN code.');
      return;
    }

    // Match coords from chosen hub or currentCoords
    const matchedHub = BANGALORE_HUBS.find(h => h.id === newAddressForm.selectedHubId) || BANGALORE_HUBS[0];
    const newId = 'addr_' + Date.now().toString().slice(-6);

    const createdAddr = {
      id: newId,
      tag: newAddressForm.tag,
      recipient_name: newAddressForm.recipient_name.trim(),
      phone: cleanPhone,
      flat_street: newAddressForm.flat_street.trim(),
      locality: matchedHub.name,
      district: newAddressForm.district || 'Bengaluru Urban',
      state: newAddressForm.state || 'Karnataka',
      pincode: newAddressForm.pincode,
      lat: matchedHub.lat,
      lng: matchedHub.lng
    };

    const updated = [createdAddr, ...savedAddresses];
    setSavedAddresses(updated);
    localStorage.setItem('chefhub_customer_addresses', JSON.stringify(updated));
    handleSelectSavedAddress(createdAddr);
    setShowNewAddressForm(false);
    setNewAddressForm({
      tag: 'Home',
      recipient_name: user?.name || 'Alex Customer',
      phone: '9845012890',
      flat_street: '',
      locality: 'Koramangala 5th Block',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560034',
      selectedHubId: 'koramangala'
    });
  };

  // --- ESCROW WALLET TOP-UP WITH FULL PAYMENT VERIFICATION ---
  const handleInitiateWalletTopUp = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const num = parseFloat(topUpAmountInput);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (num < 50) {
      alert('Minimum wallet top-up is ₹50.');
      return;
    }

    if (topUpMethod === 'CARD') {
      if (topUpCardDetails.isNewCard) {
        const raw = topUpCardDetails.cardNumber.replace(/\s+/g, '');
        if (raw.length < 15) {
          alert('Please enter complete 16-digit card number.');
          return;
        }
        if (!topUpCardDetails.expiry || topUpCardDetails.expiry.length < 5) {
          alert('Please enter expiry date (MM/YY).');
          return;
        }
        if (!topUpCardDetails.cvv || topUpCardDetails.cvv.length < 3) {
          alert('Please enter CVV.');
          return;
        }
      } else {
        if (!topUpCardDetails.selectedCardId) {
          alert('Please select a saved card or enter new card details.');
          return;
        }
      }
    } else if (topUpMethod === 'UPI') {
      if (topUpUpiDetails.upiApp === 'custom' && (!topUpUpiDetails.upiId || !topUpUpiDetails.upiId.includes('@'))) {
        alert('Please enter a valid UPI ID (e.g., alex@okaxis).');
        return;
      }
    }

    // Open 3D-Secure 2FA OTP modal
    setTopUpOtpModal({
      isOpen: true,
      amount: num,
      method: topUpMethod,
      referenceId: 'ESCROW-TOPUP-' + Math.floor(10000000 + Math.random() * 90000000),
      otpInput: '123456',
      generatedOtp: '123456',
      isVerifying: false,
      error: ''
    });
  };

  const handleVerifyTopUpOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setTopUpOtpModal(prev => ({ ...prev, isVerifying: true, error: '' }));

    // Simulate gateway delay
    await new Promise(r => setTimeout(r, 1000));

    const num = topUpOtpModal.amount;

    try {
      const token = localStorage.getItem('chefhub_token');
      if (token) {
        await fetch('/api/customer/wallet/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: num,
            payment_method: topUpOtpModal.method,
            reference_id: topUpOtpModal.referenceId
          })
        });
      }
    } catch (err) {
      console.warn('API top-up fallback:', err);
    }

    // Credit state & localStorage
    setWalletBalance(prev => {
      const next = prev + num;
      localStorage.setItem('chefhub_wallet_balance', String(next));
      return next;
    });

    // If new card and save checked, persist card
    if (topUpMethod === 'CARD' && topUpCardDetails.isNewCard && topUpCardDetails.saveForFuture) {
      const rawNum = topUpCardDetails.cardNumber.replace(/\s+/g, '');
      const last4 = rawNum.slice(-4);
      const brand = rawNum.startsWith('4') ? 'Visa' : rawNum.startsWith('5') ? 'Mastercard' : 'RuPay';
      const createdCard = {
        id: 'card_' + Date.now().toString().slice(-6),
        bank: topUpCardDetails.bankName || 'HDFC Bank',
        brand,
        last4,
        holder: topUpCardDetails.cardHolder || user?.name || 'Alex Customer',
        exp: topUpCardDetails.expiry,
        cardNumber: `${rawNum.slice(0, 4)} •••• •••• ${last4}`,
        cvv: topUpCardDetails.cvv
      };
      setSavedCards(prev => {
        const up = [...prev, createdCard];
        localStorage.setItem('chefhub_saved_cards', JSON.stringify(up));
        return up;
      });
    }

    setTopUpOtpModal(prev => ({ ...prev, isOpen: false, isVerifying: false }));
    setShowAddMoneyModal(false);
    setAddMoneySuccess(`🎉 ₹${num.toFixed(2)} credited to your Escrow Wallet via 3D-Secure!`);
    setTimeout(() => setAddMoneySuccess(''), 3000);
  };

  const handleTopUpWallet = (quickAmt) => {
    setTopUpAmountInput(String(quickAmt));
    setShowAddMoneyModal(true);
  };

  // Cuisine scroll buttons
  const scrollCuisines = (direction) => {
    if (cuisineScrollRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      cuisineScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Change Delivery Hub Preset
  const handleSelectHub = (hub) => {
    const newCoords = { lat: hub.lat, lng: hub.lng, locality: hub.name };
    setCurrentCoords(newCoords);
    const newAddr = `${hub.name}, Bengaluru, Karnataka`;
    setPrimaryAddress(newAddr);
    setAddressInputText(newAddr);
    fetchVendors(newCoords, true);
    setAddressFeedback(`📍 Delivery hub switched to ${hub.name}!`);
    setTimeout(() => setAddressFeedback(''), 2500);
  };

  // Save Primary Address to Profile via API
  const handleSavePrimaryAddress = async () => {
    if (!addressInputText.trim()) return;
    setIsSavingAddress(true);
    setAddressFeedback('');
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/auth/profile/address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          primary_address: addressInputText.trim(),
          latitude: currentCoords.lat,
          longitude: currentCoords.lng
        })
      });
      const data = await res.json();
      if (data.success) {
        setPrimaryAddress(addressInputText.trim());
        setAddressFeedback('✅ Address saved to profile!');
        fetchVendors(currentCoords, true);
        setTimeout(() => {
          setShowAddressModal(false);
          setAddressFeedback('');
        }, 1200);
      } else {
        setAddressFeedback(`❌ ${data.message || 'Failed to save address'}`);
      }
    } catch (err) {
      setAddressFeedback('❌ Connection error saving address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Coupon validation
  const handleApplyCoupon = async (codeToTry = couponCodeInput) => {
    const code = (codeToTry || '').trim().toUpperCase();
    if (!code) return;
    setCouponStatus({ state: 'VALIDATING', message: 'Validating coupon code...' });
    try {
      const res = await fetch('/api/customer/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_code: code,
          order_subtotal: cartTotal
        })
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponCodeInput(data.coupon.code);
        setCouponStatus({ state: 'SUCCESS', message: data.message });
      } else {
        setAppliedCoupon(null);
        setCouponStatus({ state: 'ERROR', message: data.message || `Coupon '${code}' is invalid.` });
      }
    } catch (err) {
      setCouponStatus({ state: 'ERROR', message: 'Server connection error validating coupon.' });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponStatus({ state: 'IDLE', message: '' });
  };

  // Select chef kitchen
  const handleSelectVendor = (v) => {
    setSelectedVendor(v);
    setSelectedChefFilter(v.vendor_id);
    setTimeout(() => {
      if (menuSectionRef.current) {
        menuSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  const toggleFavorite = (dishId) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(dishId)) next.delete(dishId);
      else next.add(dishId);
      return next;
    });
  };

  const addToCart = (dish, vendorForDish = selectedVendor) => {
    const v = vendorForDish || selectedVendor;
    const isVendorOpen = v &&
      v.is_open !== false &&
      v.is_currently_open !== false &&
      v.menu?.is_open !== false &&
      v.menu?.is_currently_open !== false;

    if (!isVendorOpen) {
      alert(`Chef is currently NOT accepting orders (${v?.closed_reason || v?.menu?.closed_reason || 'Store Closed'}). Please come back later.`);
      return;
    }

    if (enforceRadius && v?.is_within_20km === false) {
      alert(`Cannot order: Kitchen is ${v?.distance_km} km away, which exceeds our 20 km delivery radius.`);
      return;
    }

    const availableStock = dish.daily_stock !== undefined && dish.daily_stock !== null ? Number(dish.daily_stock) : 20;

    if (dish.is_available === false || dish.is_available === 0 || availableStock <= 0) {
      alert(`'${dish.name}' is currently out of stock (0 portions remaining today).`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.dish_id === dish.dish_id);
      const currentQty = existing ? existing.quantity : 0;

      if (currentQty + 1 > availableStock) {
        alert(`Cannot add more '${dish.name}': Only ${availableStock} portion${availableStock > 1 ? 's' : ''} available today.`);
        return prev;
      }
      if (currentQty >= 5) {
        alert('Maximum order limit per dish is 5 items.');
        return prev;
      }
      return existing
        ? prev.map((item) => (item.dish_id === dish.dish_id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...prev, { ...dish, vendor_id: v.vendor_id, vendor_name: v.business_name, quantity: 1 }];
    });
  };

  const updateCartQuantity = (dish_id, newQty) => {
    if (newQty <= 0) {
      removeFromCart(dish_id);
      return;
    }
    if (newQty > 5) {
      alert('Maximum limit reached: You can order up to 5 portions of this dish per order.');
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.dish_id === dish_id ? { ...item, quantity: newQty } : item))
    );
  };

  const handleAddToCartWithFeedback = (dish, vendorForDish = selectedVendor) => {
    addToCart(dish, vendorForDish);
    setAddedFeedback((prev) => ({ ...prev, [dish.dish_id]: true }));
    setTimeout(() => {
      setAddedFeedback((prev) => ({ ...prev, [dish.dish_id]: false }));
    }, 1200);
  };

  const removeFromCart = (dish_id) => {
    setCart((prev) => prev.filter((item) => item.dish_id !== dish_id));
  };

  const cartTotal = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const couponDiscountAmount = appliedCoupon ? Number(appliedCoupon.discount_amount || 0) : 0;
  const effectiveDeliveryFee = appliedCoupon?.code === 'FREESHIP' ? 0.00 : (serviceType === 'PICKUP' ? 0.00 : DELIVERY_FEE);
  const grandTotal = Math.max(0, cartTotal - couponDiscountAmount + effectiveDeliveryFee);

  const handleOpenPaymentGateway = () => {
    if (!user || user.role !== 'CUSTOMER') {
      setShowAuthModal(true);
      return;
    }
    if (cart.length === 0) return;

    if (!isCurrentAreaServiced) {
      alert('📍 Selected delivery address is outside our 20km chef delivery coverage area. Please choose a serviced delivery address to proceed.');
      setShowAddressModal(true);
      return;
    }

    if (!primaryAddress || primaryAddress.trim().length < 5) {
      setShowAddressModal(true);
      alert('Please set and save your primary delivery address first.');
      return;
    }

    setShowPaymentGatewayModal(true);
  };

  const handleExecutePaymentAndOrder = async (e, shouldFail = false) => {
    if (e && e.preventDefault) e.preventDefault();
    const vendorToOrder = selectedVendor || vendors[0];
    if (!vendorToOrder) return;

    if (!isCurrentAreaServiced) {
      alert('📍 Cannot place order: Selected address is outside our 20km chef delivery coverage area. Please switch to a serviced delivery address.');
      setIsProcessingPayment(false);
      setPaymentStage('IDLE');
      setShowAddressModal(true);
      return;
    }

    setIsProcessingPayment(true);
    setPaymentStage('PROCESSING');
    setOrderStatusMsg('🔒 Authorizing 256-Bit SSL Payment & Securing Escrow...');

    const methodLabel = paymentForm.paymentMethod === 'CARD' ? `Credit Card (${paymentForm.cardNumber.slice(-4) || '8821'})` :
                        paymentForm.paymentMethod === 'UPI' ? `UPI (${paymentForm.upiApp ? paymentForm.upiApp.toUpperCase() : 'APP'} • ${paymentForm.upiId || 'alex@upi'})` :
                        paymentForm.paymentMethod === 'NETBANKING' ? `Net Banking (${paymentForm.bankName || 'HDFC Bank'})` :
                        'ChefHub Escrow Wallet';

    if (paymentForm.paymentMethod === 'ESCROW_WALLET' && walletBalance < grandTotal) {
      alert(`Insufficient Escrow Wallet balance (Available: ₹${walletBalance.toFixed(2)}, Required: ₹${grandTotal.toFixed(2)}). Please add money to your wallet or choose another payment method.`);
      setIsProcessingPayment(false);
      setPaymentStage('IDLE');
      return;
    }

    if (shouldFail) {
      setSimulateFail(true);
      setTimeout(() => {
        setIsProcessingPayment(false);
        const failTxnId = 'TXN-FAIL-' + Math.floor(10000000 + Math.random() * 90000000);
        const failureData = {
          order_id: null,
          vendor_name: vendorToOrder.name || vendorToOrder.business_name || 'Chef Kitchen',
          vendor_id: vendorToOrder.vendor_id,
          total_amount: grandTotal.toFixed(2),
          items: [...cart],
          payment_method: methodLabel,
          payment_ref: failTxnId,
          error_reason: paymentForm.paymentMethod === 'CARD' ? 'Bank Authorization Declined: Card issuer denied test charge' :
                        paymentForm.paymentMethod === 'UPI' ? 'UPI PIN Authentication Timeout / Rejected by Bank' :
                        paymentForm.paymentMethod === 'NETBANKING' ? 'NetBanking Session Timed Out by Bank Server' :
                        'Insufficient Escrow Wallet balance',
          status: 'FAILED',
          created_at: new Date().toISOString()
        };
        setPaymentStageData(failureData);
        setPaymentStage('FAILED_ANIM');

        setTimeout(() => {
          setShowPaymentGatewayModal(false);
          setPaymentStage('IDLE');
          setSimulateFail(false);
          setMerchantTransactionView(failureData);
          setOrderStatusMsg('❌ Payment Failed: Authorization declined.');
        }, 2600);
      }, 1100);
      return;
    }

    setSimulateFail(false);
    await new Promise((resolve) => setTimeout(resolve, 1100));

    try {
      const token = localStorage.getItem('chefhub_token');

      const res = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vendor_id: vendorToOrder.vendor_id,
          items: cart.map((c) => ({ dish_id: c.dish_id, quantity: c.quantity })),
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          delivery_address: primaryAddress,
          payment_method: methodLabel
        })
      });

      const data = await res.json();
      setIsProcessingPayment(false);

      if (data.success) {
        if (paymentForm.paymentMethod === 'ESCROW_WALLET') {
          setWalletBalance(prev => Math.max(0, prev - grandTotal));
          fetchWalletBalance();
        }

        const newOrderId = data.order_id || (data.order && data.order.order_id) || Math.floor(1000 + Math.random() * 9000);
        const txnId = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);

        const orderReceipt = {
          order_id: newOrderId,
          vendor_name: vendorToOrder.name || vendorToOrder.business_name || 'Chef Kitchen',
          vendor_id: vendorToOrder.vendor_id,
          total_amount: grandTotal.toFixed(2),
          items: [...cart],
          subtotal: cartTotal.toFixed(2),
          delivery_fee: effectiveDeliveryFee.toFixed(2),
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          discount_amount: couponDiscountAmount.toFixed(2),
          payment_method: methodLabel,
          payment_ref: txnId,
          delivery_address: primaryAddress,
          status: 'CONFIRMED',
          escrow_status: 'HELD_IN_ESCROW',
          created_at: new Date().toISOString()
        };

        setPaymentStageData(orderReceipt);
        setPaymentStage('SUCCESS_ANIM');

        setTimeout(() => {
          setCart([]);
          setShowPaymentGatewayModal(false);
          setPaymentStage('IDLE');
          setConfirmedOrder(orderReceipt);
          setMerchantTransactionView(orderReceipt);
          setOrderStatusMsg('✅ Payment Successful & Order Confirmed!');
          fetchMyOrders();
          fetchVendors(currentCoords, true);
        }, 2600);
      } else {
        const failTxnId = 'TXN-FAIL-' + Math.floor(10000000 + Math.random() * 90000000);
        const failureData = {
          order_id: null,
          vendor_name: vendorToOrder.name || vendorToOrder.business_name || 'Chef Kitchen',
          vendor_id: vendorToOrder.vendor_id,
          total_amount: grandTotal.toFixed(2),
          items: [...cart],
          payment_method: methodLabel,
          payment_ref: failTxnId,
          error_reason: data.message || 'Item out of stock or insufficient inventory.',
          status: 'FAILED',
          created_at: new Date().toISOString()
        };

        setPaymentStageData(failureData);
        setPaymentStage('FAILED_ANIM');

        setTimeout(() => {
          setShowPaymentGatewayModal(false);
          setPaymentStage('IDLE');
          setMerchantTransactionView(failureData);
          setOrderStatusMsg(`❌ Order Failed: ${data.message}`);
          fetchVendors(currentCoords, true);
        }, 2600);
      }
    } catch (err) {
      console.error('Order placement execution error:', err);
      setIsProcessingPayment(false);
      const failTxnId = 'TXN-ERR-' + Math.floor(10000000 + Math.random() * 90000000);
      const failureData = {
        order_id: null,
        vendor_name: vendorToOrder.name || vendorToOrder.business_name || 'Chef Kitchen',
        vendor_id: vendorToOrder.vendor_id,
        total_amount: grandTotal.toFixed(2),
        items: [...cart],
        payment_method: methodLabel,
        payment_ref: failTxnId,
        error_reason: 'Network gateway connection timeout. Please retry.',
        status: 'FAILED',
        created_at: new Date().toISOString()
      };
      setPaymentStageData(failureData);
      setPaymentStage('FAILED_ANIM');

      setTimeout(() => {
        setShowPaymentGatewayModal(false);
        setPaymentStage('IDLE');
        setMerchantTransactionView(failureData);
      }, 2600);
    }
  };

  const executeOrderCancellation = async (order_id) => {
    setIsCancellingOrder(true);
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/customer/orders/${order_id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrderStatusMsg(`Order #${order_id} cancelled. Escrow refund initiated.`);
        setCancelModalOrder(null);
        fetchMyOrders();
      } else {
        alert(data.message || 'Failed to cancel order.');
      }
    } catch (err) {
      alert('Failed to cancel order.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleOpenTracking = (order) => {
    setActiveTrackingOrder(order);
    setTimelineAnimKey(prev => prev + 1);
  };

  const getTimelineStages = (order) => {
    if (!order) return [];
    const status = String(order.status || '').toUpperCase();
    const isCancelled = status === 'CANCELLED';

    const orderTimeRaw = order.timestamp || order.created_at || new Date();
    const baseDate = new Date(orderTimeRaw);
    const validBaseTime = !isNaN(baseDate.getTime()) ? baseDate : new Date();

    const trackingList = Array.isArray(order.tracking) ? order.tracking : [];
    const getEventTimestamp = (patterns) => {
      const match = trackingList.find(t => patterns.includes(String(t.event || '').toUpperCase()));
      return match && match.timestamp ? new Date(match.timestamp) : null;
    };

    if (isCancelled) {
      const cancelTime = getEventTimestamp(['CANCELLED', 'ORDER_CANCELLED']) || (order.updated_at ? new Date(order.updated_at) : validBaseTime);
      return [
        {
          key: 'ORDER_PLACED',
          title: 'ORDER_PLACED',
          desc: 'Order submitted and escrow payment secured',
          time: getEventTimestamp(['ORDER_PLACED']) || validBaseTime,
          isDone: true,
          isActive: false
        },
        {
          key: 'CANCELLED',
          title: 'ORDER_CANCELLED',
          desc: 'Order was cancelled; payment refund initiated to original payment method',
          time: cancelTime,
          isDone: true,
          isActive: true,
          isError: true
        }
      ];
    }

    const stageMap = {
      PLACED: 0,
      ORDER_PLACED: 0,
      PREPARING: 1,
      KITCHEN_PREPARING: 1,
      READY: 2,
      KITCHEN_READY: 2,
      READY_FOR_PICKUP: 2,
      OUT_FOR_DELIVERY: 3,
      RIDER_ACCEPTED: 3,
      DELIVERED: 4
    };

    const currentStageIdx = stageMap[status] !== undefined ? stageMap[status] : 0;

    const tPlaced = getEventTimestamp(['ORDER_PLACED']) || validBaseTime;
    const tPrep = getEventTimestamp(['KITCHEN_PREPARING', 'PREPARING']) || new Date(validBaseTime.getTime() + 3 * 60000);
    const tReady = getEventTimestamp(['KITCHEN_READY', 'READY', 'READY_FOR_PICKUP']) || new Date(validBaseTime.getTime() + 12 * 60000);
    const tRider = getEventTimestamp(['RIDER_ACCEPTED', 'OUT_FOR_DELIVERY']) || new Date(validBaseTime.getTime() + 18 * 60000);
    const tDelivered = getEventTimestamp(['DELIVERED']) || new Date(validBaseTime.getTime() + 30 * 60000);

    const baseStages = [
      {
        key: 'ORDER_PLACED',
        title: 'ORDER_PLACED',
        desc: 'Order submitted and escrow payment secured',
        time: tPlaced
      },
      {
        key: 'KITCHEN_PREPARING',
        title: 'KITCHEN_PREPARING',
        desc: `${order.vendor_name || 'Chef'} started preparing your handcrafted meal`,
        time: tPrep,
        pendingLabel: 'Waiting for chef to accept & begin preparation'
      },
      {
        key: 'KITCHEN_READY',
        title: 'KITCHEN_READY',
        desc: 'Meal packed with thermal insulation & waiting for delivery pickup',
        time: tReady,
        pendingLabel: 'Pending culinary packaging'
      },
      {
        key: 'RIDER_ACCEPTED',
        title: 'RIDER_ACCEPTED',
        desc: `${order.rider_name || 'Courier'} picked up order and is en route`,
        time: tRider,
        pendingLabel: 'Courier will be dispatched upon kitchen completion'
      },
      {
        key: 'DELIVERED',
        title: 'DELIVERED',
        desc: 'Order delivered successfully to your doorstep',
        time: tDelivered,
        pendingLabel: 'Estimated delivery: ~25-35 mins'
      }
    ];

    return baseStages.map((s, idx) => ({
      ...s,
      isDone: idx <= currentStageIdx,
      isActive: idx === currentStageIdx,
      isPending: idx > currentStageIdx,
      index: idx
    }));
  };

  // Compile Unified Dishes across all available kitchens
  const allDishesMarketplace = React.useMemo(() => {
    const list = [];
    vendors.forEach((v) => {
      // Check 20km radius limit
      const isWithinRadius = v.is_within_20km !== false;
      const isClosed = v.is_currently_open === false || v.menu?.is_currently_open === false;

      v.menu?.categories?.forEach((cat) => {
        cat.dishes?.forEach((dish) => {
          list.push({
            ...dish,
            vendor_id: v.vendor_id,
            vendor_name: v.business_name,
            vendor_distance_km: v.distance_km || 3.2,
            vendor_delivery_mins: v.estimated_delivery_mins || 25,
            vendor_is_open: !isClosed,
            vendor_is_within_radius: isWithinRadius,
            category_name: cat.category_name
          });
        });
      });
    });
    return list;
  }, [vendors]);

  // Filtered dishes for Unified Marketplace
  const filteredMarketplaceDishes = React.useMemo(() => {
    return allDishesMarketplace.filter((dish) => {
      // Chef filter
      if (selectedChefFilter !== 'ALL' && dish.vendor_id !== selectedChefFilter) {
        return false;
      }

      // Radius enforcement
      if (enforceRadius && !dish.vendor_is_within_radius) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = dish.name.toLowerCase().includes(q);
        const matchesDesc = dish.description && dish.description.toLowerCase().includes(q);
        const matchesChef = dish.vendor_name && dish.vendor_name.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesChef) return false;
      }

      // Cuisine category
      if (selectedCuisine !== 'ALL') {
        const c = selectedCuisine.toLowerCase();
        const matches = dish.name.toLowerCase().includes(c) ||
          dish.category_name.toLowerCase().includes(c) ||
          (dish.description && dish.description.toLowerCase().includes(c));
        if (!matches) return false;
      }

      // Veg only toggle
      if (vegOnly) {
        const isVeg = dish.name.toLowerCase().includes('paneer') ||
          dish.name.toLowerCase().includes('ravioli') ||
          dish.name.toLowerCase().includes('gnocchi') ||
          dish.name.toLowerCase().includes('focaccia') ||
          dish.name.toLowerCase().includes('dosa') ||
          dish.name.toLowerCase().includes('naan') ||
          dish.name.toLowerCase().includes('lassi') ||
          dish.name.toLowerCase().includes('tiramisu') ||
          dish.dietary_tags?.some(t => t.toLowerCase().includes('veg'));
        if (!isVeg) return false;
      }

      // Diet pill
      if (selectedDiet === 'VEGAN') {
        const isVeg = dish.dietary_tags?.some(t => t.toLowerCase().includes('sweet') || t.toLowerCase().includes('veg'));
        if (!isVeg) return false;
      } else if (selectedDiet === 'SPICY') {
        const isSpicy = dish.name.toLowerCase().includes('curry') || dish.name.toLowerCase().includes('tikka') || dish.name.toLowerCase().includes('pepper') || dish.name.toLowerCase().includes('ramen');
        if (!isSpicy) return false;
      } else if (selectedDiet === 'FAVORITES') {
        if (!favorites.has(dish.dish_id)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'PRICE_LOW') return a.price - b.price;
      if (sortBy === 'PRICE_HIGH') return b.price - a.price;
      return 0;
    });
  }, [allDishesMarketplace, selectedChefFilter, enforceRadius, searchQuery, selectedCuisine, vegOnly, selectedDiet, favorites, sortBy]);

  // Calculate 20km delivery service availability for selected customer location
  const isCurrentAreaServiced = React.useMemo(() => {
    if (loadingVendors) return true;
    if (currentCoords.locality?.toLowerCase().includes('airport') || currentCoords.lat > 13.1) {
      return false;
    }
    return vendors.length > 0;
  }, [loadingVendors, currentCoords.locality, currentCoords.lat, vendors.length]);

  if (loadingVendors && vendors.length === 0) {
    return (
      <KitchenLoadingScreen 
        message="Connecting to ChefHub Kitchen Ecosystem..." 
        subMessage="Calculating real-time Bangalore hub distances, live dish matrices & recipe stock" 
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      
      {/* Top Banner Promo Bar */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
          <span><strong>Zero Platform Surcharge:</strong> Direct local kitchens payout (85% Chef • 10% Rider • 5% Platform Escrow)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-white text-[10px] font-black uppercase tracking-wider">
            20km Radius Guaranteed
          </span>
        </div>
      </div>

      {/* Guest Mode or Non-Customer Role Switcher Notice */}
      {!user ? (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-base">👋</span>
            <span>Welcome to ChefHub! You are browsing as a <strong>Guest</strong>. Feel free to explore menus and gourmet dishes.</span>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In / Register to Order</span>
          </button>
        </div>
      ) : user.role !== 'CUSTOMER' ? (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-base">👤</span>
            <span>You are signed in as <strong>{user.name}</strong> ({user.role}). You have full browsing access to the Customer Marketplace.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              Customer Sign In
            </button>
            <button
              onClick={() => onLogout?.()}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition-all cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>
      ) : null}

      {/* Prominent Area Serviceability Alert Banner when 0 chefs service this location */}
      {!isCurrentAreaServiced && !loadingVendors && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-red-500/20 to-rose-500/15 border border-rose-500/35 text-rose-300 text-xs shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <MapPinOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-200">📍 Area Currently Unavailable for Delivery</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-100 text-[10px] font-black uppercase">
                  Outside 20km Radius
                </span>
              </div>
              <p className="text-xs text-rose-300/90 mt-0.5">
                We currently don't have artisan home chefs serving <strong>{currentCoords.locality || 'your selected address'}</strong> yet. We are expanding rapidly across Bengaluru!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAddressModal(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Change Address</span>
            </button>
            <button
              onClick={() => alert(`🔔 We've noted ${currentCoords.locality} on our radar! You'll be notified when home kitchens open near you.`)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer"
            >
              Notify Me When Available
            </button>
          </div>
        </div>
      )}

      {/* Modern Location Bar & Primary Address Selector */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center shadow-md shrink-0">
            <MapPin className="w-5 h-5 text-orange-500 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Delivering to</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                currentCoords.locality.includes('Airport')
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25'
              }`}>
                {currentCoords.locality.includes('Airport') ? '⚠️ Outside 20km Limit' : '🟢 Within 20km Limit'}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-md mt-0.5">
              {primaryAddress}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ChefHub Escrow Wallet Pill */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 px-2.5 py-1 text-xs">
              <span className="text-base">👛</span>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Escrow Wallet</span>
                <span className="font-mono font-black text-xs text-slate-900 dark:text-white">₹{walletBalance.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowAddMoneyModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Money</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddressModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-extrabold text-xs border border-orange-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-orange-500" />
            <span>Change Hub / Address</span>
          </button>
        </div>
      </div>

      {/* Customer View Switcher: Marketplace vs My Orders */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              {customerTab === 'MARKETPLACE' ? <Utensils className="w-3 h-3" /> : <Truck className="w-3 h-3 text-orange-500" />}
              {customerTab === 'MARKETPLACE' ? 'Independent Chefs Marketplace' : 'Customer Orders Portal'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {customerTab === 'MARKETPLACE' ? 'Gourmet Chef Marketplace' : 'My Orders & Real-time Tracking'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {customerTab === 'MARKETPLACE'
              ? 'Order handcrafted artisanal meals directly from local ghost kitchens across Bengaluru'
              : 'Monitor live kitchen preparation, courier dispatch, escrow receipts, and dish reviews'}
          </p>
        </div>

        {/* View Switcher Tabs with Smooth Sliding Rectangle Indicator */}
        <div className="relative flex items-center gap-1 p-1 backdrop-blur-2xl bg-slate-200/80 dark:bg-slate-950/80 rounded-2xl border border-slate-300/80 dark:border-slate-800 shadow-inner">
          <div
            className="absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out pointer-events-none z-0
                       bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-amber-500/25 ring-1 ring-amber-300/40"
            style={{
              transform: `translateX(${customerTabIndicator.left}px)`,
              width: `${customerTabIndicator.width}px`,
              opacity: customerTabIndicator.opacity
            }}
          />

          <button
            ref={(el) => (customerTabRefs.current['MARKETPLACE'] = el)}
            onClick={() => setCustomerTab('MARKETPLACE')}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-colors duration-200 cursor-pointer select-none ${
              customerTab === 'MARKETPLACE'
                ? 'text-slate-950 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </button>

          <button
            ref={(el) => (customerTabRefs.current['ORDERS'] = el)}
            onClick={() => setCustomerTab('ORDERS')}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-colors duration-200 cursor-pointer select-none ${
              customerTab === 'ORDERS'
                ? 'text-slate-950 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>My Orders</span>
            {myOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                customerTab === 'ORDERS'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-orange-500/20 text-orange-500 dark:text-orange-400'
              }`}>
                {myOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {orderStatusMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-extrabold shadow-lg shadow-orange-500/10 animate-pulse">
          {orderStatusMsg}
        </div>
      )}

      {/* VIEW 1: GOURMET MARKETPLACE */}
      {customerTab === 'MARKETPLACE' && (
        <div className="space-y-8">
          
          {/* Swiggy/Zomato Inspired "What's on your mind? / Browse by cuisines" Circular Carousel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>What's on your mind?</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">• Browse by Cuisines</span>
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollCuisines('left')}
                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollCuisines('right')}
                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={cuisineScrollRef}
              className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 px-1"
            >
              {CUISINE_ITEMS.map((item) => {
                const isActive = selectedCuisine === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedCuisine(item.id)}
                    className={`flex flex-col items-center gap-2 shrink-0 group cursor-pointer transition-all duration-300 ${
                      isActive ? 'scale-105' : 'hover:scale-102 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden p-1 transition-all ${
                      isActive
                        ? 'ring-4 ring-orange-500 shadow-xl shadow-orange-500/30'
                        : 'ring-2 ring-slate-200 dark:ring-slate-800 group-hover:ring-orange-400/50'
                    }`}>
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-full" />
                    </div>
                    <span className={`text-xs font-bold text-center max-w-[90px] leading-tight ${
                      isActive ? 'text-orange-500 font-black' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zomato-Style "Top Chefs for You" Circular Avatar Carousel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Top chefs for you</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">• Independent Kitchens</span>
                </h3>
              </div>
              {selectedChefFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedChefFilter('ALL')}
                  className="text-xs font-extrabold text-orange-500 hover:text-orange-400 underline cursor-pointer"
                >
                  Show All Chefs ({vendors.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {vendors.map((v) => {
                const isSelected = selectedChefFilter === v.vendor_id;
                const chefMeta = CHEF_AVATARS[v.email?.toLowerCase()] || {
                  avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=240&q=80',
                  locality: v.primary_address || 'Artisanal Kitchen'
                };
                const isClosed = v.is_currently_open === false || v.menu?.is_currently_open === false;
                const isOutOfRadius = enforceRadius && v.is_within_20km === false;

                return (
                  <button
                    key={v.vendor_id}
                    onClick={() => {
                      setSelectedChefFilter(v.vendor_id);
                      setSelectedVendor(v);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between space-y-3 backdrop-blur-xl hover:-translate-y-1 cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10 text-slate-900 dark:text-white shadow-xl shadow-orange-500/20 ring-2 ring-orange-500/40'
                        : isOutOfRadius
                        ? 'border-rose-500/30 bg-rose-500/5 opacity-60'
                        : 'border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-400 hover:border-orange-400/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-md">
                        <img
                          src={chefMeta.avatar}
                          alt={v.business_name}
                          className="w-full h-full object-cover"
                        />
                        {isClosed && (
                          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                            <Ban className="w-4 h-4 text-rose-400" />
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">{v.business_name}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{chefMeta.locality}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold">
                      <span className="text-amber-500 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> 4.9
                      </span>
                      <span className={`font-extrabold ${
                        isOutOfRadius
                          ? 'text-rose-500'
                          : isClosed
                          ? 'text-slate-400'
                          : 'text-emerald-500'
                      }`}>
                        {isOutOfRadius ? `${v.distance_km} km (>20km)` : `${v.distance_km || 2.4} km • ${v.estimated_delivery_mins || 25}m`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FoodChow-Inspired Main Marketplace: Left Filter Sidebar + Unified Dishes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
            
            {/* Left Filter Sidebar (FoodChow / Zomato Style) */}
            <div className="lg:col-span-1 space-y-5">
              <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl space-y-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                    <span>Filters & Sort</span>
                  </h4>
                  <button
                    onClick={() => {
                      setVegOnly(false);
                      setSelectedCuisine('ALL');
                      setSelectedDiet('ALL');
                      setSelectedChefFilter('ALL');
                      setSearchQuery('');
                      setSortBy('RECOMMENDED');
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-orange-500"
                  >
                    Reset
                  </button>
                </div>

                {/* Service Mode: Delivery vs Pickup */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                    <button
                      onClick={() => setServiceType('DELIVERY')}
                      className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
                        serviceType === 'DELIVERY'
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Delivery</span>
                    </button>
                    <button
                      onClick={() => setServiceType('PICKUP')}
                      className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
                        serviceType === 'PICKUP'
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Takeaway</span>
                    </button>
                  </div>
                </div>

                {/* Pure Veg Toggle */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 p-0.5 rounded flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">Veg Only</span>
                  </div>
                  <button
                    onClick={() => setVegOnly(!vegOnly)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      vegOnly ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      vegOnly ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 20km Radius Checkbox */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">20km Limit</span>
                    <span className="text-[10px] text-slate-500">Filter out chefs &gt;20km away</span>
                  </div>
                  <button
                    onClick={() => setEnforceRadius(!enforceRadius)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      enforceRadius ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      enforceRadius ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Filter by Chef */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter by Chef</label>
                  <select
                    value={selectedChefFilter}
                    onChange={(e) => {
                      const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                      setSelectedChefFilter(val);
                      if (val !== 'ALL') {
                        const found = vendors.find(v => v.vendor_id === val);
                        if (found) setSelectedVendor(found);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-orange-500"
                  >
                    <option value="ALL">All Kitchens ({vendors.length} Chefs)</option>
                    {vendors.map((v) => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.business_name} ({v.distance_km} km)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" />
                    <span>Sort By</span>
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'RECOMMENDED', label: '⭐ Recommended' },
                      { id: 'PRICE_LOW', label: '💵 Price: Low to High' },
                      { id: 'PRICE_HIGH', label: '💎 Price: High to Low' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSortBy(s.id)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                          sortBy === s.id
                            ? 'bg-orange-500/15 text-orange-500 dark:text-orange-400 font-extrabold border border-orange-500/30'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Right 3 Cols: Search Bar + Unified Dishes Marketplace Grid */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Search Bar & Diet Segment */}
              <div className="glass-card rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dishes, chefs, ramen, biryani..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-orange-500 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'VEGAN', label: '🌿 Vegetarian' },
                    { id: 'SPICY', label: '🌶️ Spicy' },
                    { id: 'FAVORITES', label: `❤️ Favorites (${favorites.size})` }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setSelectedDiet(chip.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer ${
                        selectedDiet === chip.id
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dishes Count Banner */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Showing <strong>{filteredMarketplaceDishes.length}</strong> handcrafted dishes</span>
                {selectedChefFilter !== 'ALL' && (
                  <span className="text-orange-500 font-bold">Filtered by selected chef</span>
                )}
              </div>

              {/* Unified Dishes Grid */}
              {filteredMarketplaceDishes.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 text-center space-y-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
                  <Utensils className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">No dishes found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try adjusting your search query, cuisine filter, or location delivery radius to view more dishes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredMarketplaceDishes.map((dish) => {
                    const cartItem = cart.find((item) => item.dish_id === dish.dish_id);
                    const isFav = favorites.has(dish.dish_id);
                    const isDishAvailable = dish.is_available !== false && dish.is_available !== 0 && (dish.daily_stock === undefined || Number(dish.daily_stock) > 0);
                    const isVendorOpen = dish.vendor_is_open;

                    return (
                      <div
                        key={`${dish.vendor_id}-${dish.dish_id}`}
                        className={`dish-card glass-card rounded-3xl overflow-hidden border flex flex-col justify-between group shadow-lg transition-all ${
                          !isVendorOpen
                            ? 'opacity-40 grayscale bg-slate-900/90 border-rose-500/30'
                            : !isDishAvailable
                            ? 'opacity-60 grayscale bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:shadow-2xl'
                        }`}
                      >
                        {/* Food Image */}
                        <div className="relative h-44 w-full overflow-hidden bg-slate-200 dark:bg-slate-950">
                          <img
                            src={getDishImage(dish)}
                            alt={dish.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = fallbackImages[dish.name] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                            }}
                            className={`food-image-zoom w-full h-full object-cover ${!isVendorOpen || !isDishAvailable ? 'grayscale opacity-50' : ''}`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                          {/* Floating Price Pill */}
                          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-500/40 text-amber-400 font-black text-xs shadow-xl flex items-center gap-1 z-20">
                            <span>₹{Number(dish.price).toFixed(2)}</span>
                          </div>

                          {/* Favorite Heart Button */}
                          <button
                            onClick={() => toggleFavorite(dish.dish_id)}
                            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors z-20 cursor-pointer"
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>

                          {/* Chef Kitchen Tag */}
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white z-20 font-bold">
                            <span className="truncate max-w-[150px] bg-slate-950/80 px-2 py-0.5 rounded-md border border-white/10">
                              👨‍🍳 {dish.vendor_name}
                            </span>
                            <span className="bg-orange-500/90 text-white px-2 py-0.5 rounded-md font-mono text-[10px]">
                              {dish.vendor_distance_km} km
                            </span>
                          </div>
                        </div>

                        {/* Dish Details */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-1">
                                {dish.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {dish.description}
                            </p>
                          </div>

                          {/* Bottom Row: Stock Status & Add to Cart */}
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div className="text-[10px] font-bold text-slate-500">
                              {dish.daily_stock !== undefined ? (
                                <span className={Number(dish.daily_stock) <= 5 ? 'text-amber-500 font-extrabold' : 'text-emerald-500'}>
                                  ● {dish.daily_stock} left
                                </span>
                              ) : (
                                <span className="text-emerald-500">● In Stock</span>
                              )}
                            </div>

                            {cartItem ? (
                              <div className="flex items-center gap-2 bg-orange-500 text-white rounded-xl px-2 py-1 shadow-md">
                                <button
                                  onClick={() => updateCartQuantity(dish.dish_id, cartItem.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center font-bold text-sm cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-mono font-black text-xs min-w-[16px] text-center">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQuantity(dish.dish_id, cartItem.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center font-bold text-sm cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddToCartWithFeedback(dish, vendors.find(v => v.vendor_id === dish.vendor_id))}
                                disabled={!isVendorOpen || !isDishAvailable}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                                  !isVendorOpen || !isDishAvailable
                                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                                }`}
                              >
                                {addedFeedback[dish.dish_id] ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Added!</span>
                                  </>
                                ) : (
                                  <>
                                    <span>ADD</span>
                                    <span className="text-[10px] opacity-75">+</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: MY ORDERS & REAL-TIME TRACKING */}
      {customerTab === 'ORDERS' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Order History & Deliveries</h2>
              <p className="text-xs text-slate-500">Live order journey, escrow transparency and dish ratings</p>
            </div>

            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-950 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'All Orders' },
                { id: 'ACTIVE', label: 'Active En Route' },
                { id: 'DELIVERED', label: 'Delivered' },
                { id: 'CANCELLED', label: 'Cancelled' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOrdersFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ordersFilter === f.id
                      ? 'bg-orange-500 text-white font-black shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {(() => {
            const filteredOrders = myOrders.filter(o => {
              if (ordersFilter === 'ACTIVE') return !['DELIVERED', 'CANCELLED'].includes(o.status);
              if (ordersFilter === 'DELIVERED') return o.status === 'DELIVERED';
              if (ordersFilter === 'CANCELLED') return o.status === 'CANCELLED';
              return true;
            });

            if (filteredOrders.length === 0) {
              return (
                <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80">
                  <ShoppingBag className="w-12 h-12 text-orange-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">No Orders Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      {ordersFilter === 'ALL'
                        ? "You haven't placed any orders yet. Explore our handcrafted gourmet marketplace!"
                        : `No orders matching filter "${ordersFilter}".`}
                    </p>
                  </div>
                  <button
                    onClick={() => setCustomerTab('MARKETPLACE')}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-lg hover:bg-orange-600"
                  >
                    Browse Gourmet Menus
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredOrders.map(o => (
                  <div
                    key={o.order_id}
                    className="glass-card rounded-3xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl space-y-4 shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shrink-0">
                            {o.vendor_name ? o.vendor_name[0] : 'C'}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 dark:text-white text-base">Order #{o.order_id}</span>
                            <p className="text-xs text-slate-500">Chef: <strong className="text-slate-900 dark:text-slate-200">{o.vendor_name}</strong></p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          o.status === 'DELIVERED'
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : o.status === 'CANCELLED'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse'
                        }`}>
                          {o.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        {Array.isArray(o.items) && o.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
                            <span>{it.quantity} × {it.name || it.dish_name}</span>
                            <span className="font-mono font-bold">₹{Number(it.price_at_purchase || it.price || 0) * Number(it.quantity || 1)}</span>
                          </div>
                        ))}

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-mono">
                            {new Date(o.created_at || Date.now()).toLocaleString()}
                          </span>
                          <span className="text-sm font-black text-amber-500">
                            Total: ₹{Number(o.total_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Cancelled Order Refund Details Banner */}
                      {o.status === 'CANCELLED' && (
                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-rose-500 flex items-center gap-1.5">
                              <Ban className="w-3.5 h-3.5" /> Order Cancelled by Chef
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase">
                              100% Escrow Refunded
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            Full escrow refund of <strong className="text-slate-900 dark:text-white">₹{Number(o.total_amount).toFixed(2)}</strong> has been credited back to your account ({o.payment_method || 'ChefHub Escrow Wallet'}).
                          </p>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                            <span>Ref: REF-{o.order_id}-ESCROW</span>
                            <span className="text-emerald-500 font-bold">✓ Refund Settled</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => handleOpenTracking(o)}
                        className="flex-1 min-w-[130px] py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track Order</span>
                      </button>

                      <button
                        onClick={() => setConfirmedOrder(o)}
                        className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Receipt</span>
                      </button>

                      {o.status === 'PLACED' && (
                        <button
                          onClick={() => setCancelModalOrder(o)}
                          className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs border border-rose-500/25 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}

                      {o.status === 'DELIVERED' && (
                        <button
                          onClick={() => {
                            setReviewOrder(o);
                            setVendorRating(5);
                            setRiderRating(5);
                            setReviewComment('');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-black text-xs border border-amber-500/25 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>Rate Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Floating Bottom Cart Bar (Mobile) */}
      {cart.length > 0 && customerTab === 'MARKETPLACE' && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto md:hidden">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-extrabold text-xs shadow-2xl flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{cart.length} Item{cart.length > 1 ? 's' : ''} in Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-black/20 px-2 py-0.5 rounded-lg">₹{grandTotal.toFixed(2)}</span>
              <span>Checkout →</span>
            </div>
          </button>
        </div>
      )}

      {/* Desktop Floating Cart Side Pill */}
      {cart.length > 0 && customerTab === 'MARKETPLACE' && (
        <div className="fixed bottom-6 right-6 z-40 hidden md:block">
          <button
            onClick={handleOpenPaymentGateway}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-2xl flex items-center gap-3 cursor-pointer ring-2 ring-white/20 transition-all hover:scale-105"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </div>
            <span>View Cart • ₹{grandTotal.toFixed(2)}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dedicated Add Money to Escrow Wallet Modal with Full Payment Credentials */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-xl w-full space-y-5 shadow-2xl animate-in fade-in my-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  👛
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Top-Up Escrow Wallet</h3>
                  <p className="text-[11px] text-slate-500">RBI & NPCI Compliant Buyer Escrow Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMoneyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addMoneySuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{addMoneySuccess}</span>
              </div>
            )}

            {/* Current Balance Status Bar */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Wallet Balance</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">₹{walletBalance.toFixed(2)}</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 text-[10px] font-extrabold uppercase tracking-wider">
                🛡️ Active Escrow
              </span>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Top-Up Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={topUpAmountInput}
                  onChange={(e) => setTopUpAmountInput(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm font-mono font-bold outline-none focus:border-orange-500"
                />
              </div>

              {/* Quick Select Preset Chips */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[200, 500, 1000, 2000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmountInput(String(amt))}
                    className={`py-1.5 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer ${
                      Number(topUpAmountInput) === amt
                        ? 'border-orange-500 bg-orange-500/15 text-orange-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Choose Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CARD', label: 'Debit / Card', icon: '💳' },
                  { id: 'UPI', label: 'UPI / QR', icon: '⚡' },
                  { id: 'NETBANKING', label: 'Net Banking', icon: '🏦' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTopUpMethod(m.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      topUpMethod === m.id
                        ? 'border-orange-500 bg-orange-500/15 text-orange-500 font-black ring-1 ring-orange-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* 1. CARD TOP-UP FORM */}
              {topUpMethod === 'CARD' && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Saved Cards (RBI Compliant)</span>
                    <span className="text-[10px] text-slate-400">100% Tokenized</span>
                  </div>

                  {/* List of saved cards with DELETE option */}
                  <div className="space-y-2">
                    {savedCards.map(c => {
                      const isSelected = !topUpCardDetails.isNewCard && topUpCardDetails.selectedCardId === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div
                            onClick={() => setTopUpCardDetails(prev => ({ ...prev, selectedCardId: c.id, isNewCard: false }))}
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs">
                              💳
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900 dark:text-white">{c.bank}</span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold uppercase">{c.brand}</span>
                              </div>
                              <span className="font-mono text-[11px] text-slate-500">•••• {c.last4} • Exp: {c.exp}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCard(c.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete saved card (RBI Privacy Compliance)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setTopUpCardDetails(prev => ({ ...prev, isNewCard: !prev.isNewCard }))}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-orange-500 hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{topUpCardDetails.isNewCard ? 'Use a Saved Card' : 'Enter New Card Credentials'}</span>
                    </button>
                  </div>

                  {/* New Card Input Fields */}
                  {topUpCardDetails.isNewCard && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Card Number (16 Digits)</label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={19}
                            value={topUpCardDetails.cardNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                              const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                              setTopUpCardDetails(prev => ({ ...prev, cardNumber: formatted }));
                            }}
                            placeholder="4532 8892 1042 8821"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                          />
                          <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Name on Card</label>
                        <input
                          type="text"
                          value={topUpCardDetails.cardHolder}
                          onChange={(e) => setTopUpCardDetails(prev => ({ ...prev, cardHolder: e.target.value }))}
                          placeholder="Full name as printed on card"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={topUpCardDetails.expiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                              setTopUpCardDetails(prev => ({ ...prev, expiry: val }));
                            }}
                            placeholder="08/29"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">CVV / Security Code</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={topUpCardDetails.cvv}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setTopUpCardDetails(prev => ({ ...prev, cvv: val }));
                            }}
                            placeholder="•••"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold tracking-widest outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={topUpCardDetails.saveForFuture}
                          onChange={(e) => setTopUpCardDetails(prev => ({ ...prev, saveForFuture: e.target.checked }))}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                          Save card securely for future payments (RBI Tokenized)
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* 2. UPI TOP-UP FORM */}
              {topUpMethod === 'UPI' && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Choose Instant UPI App</span>
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Zero Gateway Fees</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'gpay', name: 'Google Pay', icon: '🔵', handle: '@okaxis' },
                      { id: 'phonepe', name: 'PhonePe', icon: '🟣', handle: '@ybl' },
                      { id: 'paytm', name: 'Paytm UPI', icon: '🔷', handle: '@paytm' },
                      { id: 'bhim', name: 'BHIM UPI', icon: '🟠', handle: '@upi' }
                    ].map(app => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setTopUpUpiDetails(prev => ({
                          ...prev,
                          upiApp: app.id,
                          upiId: `alex.customer${app.handle}`,
                          isVerified: true
                        }))}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          topUpUpiDetails.upiApp === app.id
                            ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span className="text-xl">{app.icon}</span>
                        <span className="text-xs font-extrabold text-center">{app.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom UPI ID */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-500">Or Enter Customer UPI ID (VPA)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={topUpUpiDetails.upiId}
                        onChange={(e) => setTopUpUpiDetails(prev => ({ ...prev, upiId: e.target.value.toLowerCase(), isVerified: false }))}
                        placeholder="yourname@okhdfcbank"
                        className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setTopUpUpiDetails(prev => ({ ...prev, isVerified: true }))}
                        className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs cursor-pointer"
                      >
                        {topUpUpiDetails.isVerified ? '✓ Verified' : 'Verify'}
                      </button>
                    </div>

                    {topUpUpiDetails.isVerified && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Verified NPCI UPI ID ({user?.name || 'Alex Customer'})</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic QR Code Generator */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTopUpUpiDetails(prev => ({ ...prev, showQr: !prev.showQr }))}
                      className="w-full py-2 px-3 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <QrCode className="w-4 h-4 text-orange-500" />
                      <span>{topUpUpiDetails.showQr ? 'Hide Dynamic UPI QR Code' : 'Show Dynamic UPI QR Code for Quick Scan'}</span>
                    </button>

                    {topUpUpiDetails.showQr && (
                      <div className="p-4 mt-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 animate-in fade-in">
                        <div className="inline-block p-3 rounded-2xl bg-white border border-slate-200 shadow-md">
                          <svg className="w-36 h-36 mx-auto" viewBox="0 0 100 100">
                            <rect width="100" height="100" fill="#ffffff" />
                            {/* Visual QR Pattern Simulation */}
                            <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                            <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                            <rect x="18" y="18" width="9" height="9" fill="#f97316" />
                            <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                            <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                            <rect x="73" y="18" width="9" height="9" fill="#f97316" />
                            <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                            <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                            <rect x="18" y="73" width="9" height="9" fill="#f97316" />
                            <rect x="42" y="15" width="15" height="8" fill="#0f172a" />
                            <rect x="42" y="30" width="8" height="15" fill="#0f172a" />
                            <rect x="55" y="42" width="15" height="15" fill="#0f172a" />
                            <rect x="42" y="65" width="10" height="20" fill="#0f172a" />
                            <rect x="65" y="65" width="20" height="10" fill="#0f172a" />
                            <rect x="75" y="78" width="12" height="12" fill="#0f172a" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            Scan with Any UPI App to Pay ₹{Number(topUpAmountInput || 0).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            VPA: chefhub.escrow@icici • Valid for 04:59 mins
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. NETBANKING TOP-UP FORM */}
              {topUpMethod === 'NETBANKING' && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Popular Indian Banks</span>
                    <span className="text-[10px] text-slate-400 font-bold">50+ Banks Supported</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      'HDFC Bank',
                      'State Bank of India (SBI)',
                      'ICICI Bank',
                      'Axis Bank',
                      'Kotak Mahindra Bank',
                      'Punjab National Bank'
                    ].map(bank => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setTopUpNetBankingDetails({ bankName: bank })}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                          topUpNetBankingDetails.bankName === bank
                            ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span>🏦</span>
                        <span className="truncate">{bank}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Or Choose from All Indian Banks</label>
                    <select
                      value={topUpNetBankingDetails.bankName}
                      onChange={(e) => setTopUpNetBankingDetails({ bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Bank of Baroda">Bank of Baroda</option>
                      <option value="Canara Bank">Canara Bank</option>
                      <option value="Union Bank of India">Union Bank of India</option>
                      <option value="IndusInd Bank">IndusInd Bank</option>
                      <option value="Federal Bank">Federal Bank</option>
                      <option value="IDFC First Bank">IDFC First Bank</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleInitiateWalletTopUp}
                disabled={isAddingMoney || !topUpAmountInput || Number(topUpAmountInput) <= 0}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Proceed to Add ₹{Number(topUpAmountInput || 0).toFixed(2)} to Wallet</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddMoneyModal(false)}
                className="px-4 py-3.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D-Secure 2FA / OTP Verification Modal for Top-Up */}
      {topUpOtpModal.isOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <h4 className="font-black text-sm">3D-Secure 2FA Verification</h4>
                  <p className="text-[10px] text-slate-500">RBI SafeKey Escrow Verification</p>
                </div>
              </div>
              <button
                onClick={() => setTopUpOtpModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Merchant:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">ChefHub Escrow Holdings</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Ref Number:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{topUpOtpModal.referenceId}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Top-Up Amount:</span>
                <span className="font-mono font-black text-amber-500">₹{Number(topUpOtpModal.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{topUpOtpModal.method}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">
                Enter 6-Digit One-Time Password (OTP) sent to •••• 8920
              </label>
              <input
                type="text"
                maxLength={6}
                value={topUpOtpModal.otpInput}
                onChange={(e) => setTopUpOtpModal(prev => ({ ...prev, otpInput: e.target.value.replace(/\D/g, '') }))}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-center font-mono text-lg font-black tracking-widest outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => setTopUpOtpModal(prev => ({ ...prev, otpInput: '123456' }))}
                className="text-[11px] text-orange-500 font-bold hover:underline block text-center cursor-pointer"
              >
                Click to autofill test OTP: 123456
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleVerifyTopUpOtp}
                disabled={topUpOtpModal.isVerifying || topUpOtpModal.otpInput.length < 4}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {topUpOtpModal.isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with Bank...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Authorize & Credit ₹{Number(topUpOtpModal.amount).toFixed(2)}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTopUpOtpModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Address & Location Management Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-2xl w-full space-y-5 shadow-2xl my-auto animate-in fade-in">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Delivery Address & Service Availability</h3>
                  <p className="text-[11px] text-slate-500">Manage multiple addresses and check 20km kitchen coverage</p>
                </div>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addressFeedback && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
                {addressFeedback}
              </div>
            )}

            {/* List of Saved Addresses with Add / Delete Functionality */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Saved Customer Addresses ({savedAddresses.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(prev => !prev)}
                  className="px-3 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-extrabold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showNewAddressForm ? 'Cancel Add Address' : 'Add New Address'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedAddresses.map((addr) => {
                  const isActive = primaryAddress.includes(addr.flat_street) || primaryAddress.includes(addr.locality);
                  return (
                    <div
                      key={addr.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive
                          ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-slate-400'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase flex items-center gap-1">
                            {addr.tag === 'Home' ? <Home className="w-3 h-3" /> : addr.tag === 'Work' ? <Briefcase className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                            <span>{addr.tag}</span>
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{addr.recipient_name}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{addr.phone}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {addr.flat_street}, {addr.locality}, {addr.district}, {addr.state} - <span className="font-mono font-bold">{addr.pincode}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 text-xs font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivering Here</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition-colors cursor-pointer"
                          >
                            Deliver Here
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAddress(addr.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapsible New Address Form */}
            {showNewAddressForm && (
              <form onSubmit={handleSaveNewAddress} className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 space-y-3 animate-in fade-in">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-orange-500" />
                  <span>Enter New Customer Delivery Address</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={newAddressForm.recipient_name}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                      placeholder="e.g. Alex Customer"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={newAddressForm.phone}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                      placeholder="9845012890"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Address Tag</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['Home', 'Work', 'Other'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNewAddressForm(prev => ({ ...prev, tag }))}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            newAddressForm.tag === tag
                              ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Flat / House No, Building, Street</label>
                  <input
                    type="text"
                    required
                    value={newAddressForm.flat_street}
                    onChange={(e) => setNewAddressForm(prev => ({ ...prev, flat_street: e.target.value }))}
                    placeholder="e.g. Flat 301, Brigade Millennium, 7th Phase"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-semibold outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Bangalore Hub / Area</label>
                    <select
                      value={newAddressForm.selectedHubId}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, selectedHubId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                    >
                      {BANGALORE_HUBS.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">District / City</label>
                    <input
                      type="text"
                      value={newAddressForm.district}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="Bengaluru Urban"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-semibold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">PIN Code (6 Digits)</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={newAddressForm.pincode}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                      placeholder="560034"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Save & Set as Delivery Address
                  </button>
                </div>
              </form>
            )}

            {/* Quick Bangalore Delivery Hubs Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Bangalore Location Availability Hubs</span>
                <span className="text-[10px] text-slate-400 font-normal">Select to test delivery coverage</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BANGALORE_HUBS.map((hub) => {
                  const isSelected = currentCoords.locality === hub.name;
                  const isOutside = hub.name.includes('Airport');
                  return (
                    <button
                      key={hub.id}
                      onClick={() => handleSelectHub(hub)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/15 text-orange-500 ring-1 ring-orange-500'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-xs">{hub.name}</h5>
                        {isOutside && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono text-[9px] font-bold">
                            &gt;20km Test
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{hub.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowAddressModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal with Strict Coupon Code & Profile Address */}
      {showPaymentGatewayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-300 dark:border-slate-800 max-w-2xl w-full space-y-5 shadow-2xl my-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit SSL Escrow Protected
                  </span>
                </div>
                <h3 className="text-xl font-extrabold mt-1 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  <span>Secure Checkout & Escrow Payment</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  if (paymentStage === 'IDLE') setShowPaymentGatewayModal(false);
                }}
                disabled={paymentStage !== 'IDLE'}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stages: SUCCESS / FAILED animations */}
            {paymentStage === 'SUCCESS_ANIM' && (
              <div className="py-8 px-4 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black">Payment Completed! 🎉</h3>
                <p className="text-xs text-slate-500">
                  Authorized <strong>₹{grandTotal.toFixed(2)}</strong>. Escrow hold is active.
                </p>
              </div>
            )}

            {paymentStage === 'FAILED_ANIM' && (
              <div className="py-8 px-4 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto shadow-xl">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black">Payment Failed ❌</h3>
                <p className="text-xs text-rose-500">
                  {paymentStageData?.error_reason || 'Authorization declined.'}
                </p>
              </div>
            )}

            {/* IDLE / PROCESSING */}
            {(paymentStage === 'IDLE' || paymentStage === 'PROCESSING') && (
              <div className="space-y-4">
                
                {/* 1. Saved Primary Delivery Address Card (NO EDITABLE INPUT) */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <span>Delivery Address (Saved in Profile)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(true)}
                      className="text-xs font-bold text-orange-500 hover:text-orange-400 underline cursor-pointer"
                    >
                      Change Address
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold pl-6">
                    {primaryAddress}
                  </p>
                  <div className="flex items-center gap-2 pl-6 text-[10px] text-slate-500">
                    <span className="bg-emerald-500/10 text-emerald-500 font-mono font-bold px-2 py-0.5 rounded">
                      GPS: {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
                    </span>
                    <span>• Hub: {currentCoords.locality}</span>
                  </div>

                  {!isCurrentAreaServiced && (
                    <div className="p-3 mt-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-500 text-xs font-bold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPinOff className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>Area currently outside our 20km chef delivery radius.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(true)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-black cursor-pointer hover:bg-rose-600 transition-colors"
                      >
                        Change Address
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Strict Promo Coupon Code Section */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-orange-500" />
                      <span>Apply Promotional Coupon Code</span>
                    </label>
                    {appliedCoupon && (
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove Coupon
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. CHEF50)"
                      disabled={!!appliedCoupon}
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold uppercase outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      disabled={!!appliedCoupon || !couponCodeInput.trim()}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-extrabold text-xs cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Quick Select Promo Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {PROMO_CHIPS.map((chip) => (
                      <button
                        key={chip.code}
                        type="button"
                        onClick={() => handleApplyCoupon(chip.code)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                          appliedCoupon?.code === chip.code
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-500'
                        }`}
                      >
                        🏷️ {chip.code} ({chip.title})
                      </button>
                    ))}
                  </div>

                  {couponStatus.message && (
                    <div className={`text-[11px] font-bold ${
                      couponStatus.state === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {couponStatus.message}
                    </div>
                  )}
                </div>

                {/* 3. Payment Method Tabs & Detailed Input Forms */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'CARD', label: 'Card', icon: '💳' },
                      { id: 'UPI', label: 'UPI', icon: '⚡' },
                      { id: 'NETBANKING', label: 'NetBank', icon: '🏦' },
                      { id: 'ESCROW_WALLET', label: 'Wallet', icon: '👛' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: m.id })}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                          paymentForm.paymentMethod === m.id
                            ? 'bg-orange-500 text-white font-black shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* A. CARD FORM */}
                  {paymentForm.paymentMethod === 'CARD' && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Credit / Debit Card Details</span>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-extrabold text-[10px]">VISA</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-extrabold text-[10px]">Mastercard</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-extrabold text-[10px]">RuPay</span>
                        </div>
                      </div>

                      {/* Saved Cards Quick Select with Delete */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {savedCards.map(c => {
                            const isSelected = paymentForm.cardNumber.replace(/\s+/g, '').endsWith(c.last4);
                            return (
                              <div
                                key={c.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500/10 text-orange-500 ring-1 ring-orange-500'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setPaymentForm(prev => ({
                                    ...prev,
                                    cardNumber: `4532 8892 1042 ${c.last4}`,
                                    cardHolder: c.holder || user?.name || 'Alex Customer',
                                    expiry: c.exp,
                                    cvv: c.cvv || '888'
                                  }))}
                                  className="text-left flex-1 cursor-pointer"
                                >
                                  <span className="block font-bold text-xs">💳 {c.bank}</span>
                                  <span className="font-mono text-[10px] text-slate-400">•••• {c.last4} ({c.brand})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveCard(c.id);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                  title="Remove saved card (RBI compliance)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowAddCardModal(true)}
                          className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-bold text-orange-500 hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add New Card to Saved Cards</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Card Number (16 Digits)</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={paymentForm.cardNumber}
                              maxLength={19}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                                const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                                setPaymentForm(prev => ({ ...prev, cardNumber: formatted }));
                              }}
                              placeholder="4532 8892 1042 8821"
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                            />
                            <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Cardholder Name</label>
                          <input
                            type="text"
                            value={paymentForm.cardHolder}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, cardHolder: e.target.value }))}
                            placeholder="Full name as printed on card"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Expiry Date (MM/YY)</label>
                            <input
                              type="text"
                              value={paymentForm.expiry}
                              maxLength={5}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                                setPaymentForm(prev => ({ ...prev, expiry: val }));
                              }}
                              placeholder="08/29"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">CVV / Security Code</label>
                            <input
                              type="password"
                              value={paymentForm.cvv}
                              maxLength={4}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setPaymentForm(prev => ({ ...prev, cvv: val }));
                              }}
                              placeholder="•••"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold tracking-widest outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* B. UPI FORM */}
                  {paymentForm.paymentMethod === 'UPI' && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Pay via UPI App or ID</span>
                        <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⚡ 100% Escrow Protection
                        </span>
                      </div>

                      {/* 4 Popular Apps */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500">Choose Instant UPI Application</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'gpay', name: 'Google Pay', icon: '🔵', handle: '@okaxis' },
                            { id: 'phonepe', name: 'PhonePe', icon: '🟣', handle: '@ybl' },
                            { id: 'paytm', name: 'Paytm UPI', icon: '🔷', handle: '@paytm' },
                            { id: 'bhim', name: 'BHIM UPI', icon: '🟠', handle: '@upi' }
                          ].map(app => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => setPaymentForm(prev => ({
                                ...prev,
                                upiApp: app.id,
                                upiId: `alex.customer${app.handle}`,
                                isUpiVerified: true
                              }))}
                              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                paymentForm.upiApp === app.id
                                  ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <span className="text-xl">{app.icon}</span>
                              <span className="text-xs font-extrabold text-center">{app.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom UPI ID */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-bold text-slate-500">Or Enter UPI ID / VPA</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={paymentForm.upiId}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, upiId: e.target.value.toLowerCase(), isUpiVerified: false }))}
                            placeholder="yourname@bank"
                            className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, isUpiVerified: true }))}
                            className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs cursor-pointer"
                          >
                            {paymentForm.isUpiVerified ? '✓ Verified' : 'Verify'}
                          </button>
                        </div>

                        {paymentForm.isUpiVerified && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Verified NPCI UPI ID ({user?.name || 'Alex Customer'})</span>
                          </div>
                        )}

                        {/* Suffix pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['@okhdfcbank', '@okaxis', '@ybl', '@paytm', '@ibl'].map(handle => (
                            <button
                              key={handle}
                              type="button"
                              onClick={() => {
                                const prefix = paymentForm.upiId.split('@')[0] || 'alex.customer';
                                setPaymentForm(prev => ({ ...prev, upiId: `${prefix}${handle}`, isUpiVerified: true }));
                              }}
                              className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:border-orange-500 cursor-pointer"
                            >
                              {handle}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* C. NETBANKING FORM */}
                  {paymentForm.paymentMethod === 'NETBANKING' && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Select Bank</span>
                        <span className="text-[10px] text-slate-400 font-bold">50+ Banks Supported</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          'HDFC Bank',
                          'State Bank of India (SBI)',
                          'ICICI Bank',
                          'Axis Bank',
                          'Kotak Mahindra Bank',
                          'Punjab National Bank'
                        ].map(bank => (
                          <button
                            key={bank}
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, bankName: bank }))}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                              paymentForm.bankName === bank
                                ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                            }`}
                          >
                            <span>🏦</span>
                            <span className="truncate">{bank}</span>
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">All Other Indian Banks</label>
                        <select
                          value={paymentForm.bankName}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, bankName: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                        >
                          <option value="HDFC Bank">HDFC Bank</option>
                          <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                          <option value="ICICI Bank">ICICI Bank</option>
                          <option value="Axis Bank">Axis Bank</option>
                          <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                          <option value="Bank of Baroda">Bank of Baroda</option>
                          <option value="Canara Bank">Canara Bank</option>
                          <option value="Union Bank of India">Union Bank of India</option>
                          <option value="IndusInd Bank">IndusInd Bank</option>
                          <option value="Federal Bank">Federal Bank</option>
                          <option value="IDFC First Bank">IDFC First Bank</option>
                          <option value="Yes Bank">Yes Bank</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* D. WALLET FORM */}
                  {paymentForm.paymentMethod === 'ESCROW_WALLET' && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">ChefHub Escrow Wallet</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-[10px] uppercase">
                          Escrow Protected
                        </span>
                      </div>

                      {/* Wallet Balance Display */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-orange-500/15 border border-orange-500/25 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md">
                            👛
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available Balance</span>
                            <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                              ₹{walletBalance.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddMoneyModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Money</span>
                        </button>
                      </div>

                      {/* Sufficiency Check */}
                      {walletBalance >= grandTotal ? (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                          <div className="flex items-center gap-1.5 font-black">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Sufficient Balance for this Order!</span>
                          </div>
                          <p className="text-[11px]">
                            Order due: <strong>₹{grandTotal.toFixed(2)}</strong>. Balance remaining after payment: <strong>₹{(walletBalance - grandTotal).toFixed(2)}</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-400 space-y-2">
                          <div className="flex items-center gap-1.5 font-black">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <span>Insufficient Wallet Balance</span>
                          </div>
                          <p className="text-[11px]">
                            Total due is <strong>₹{grandTotal.toFixed(2)}</strong>, but wallet has <strong>₹{walletBalance.toFixed(2)}</strong> (Deficit: <strong>₹{(grandTotal - walletBalance).toFixed(2)}</strong>).
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleTopUpWallet(Math.ceil(grandTotal - walletBalance + 50))}
                              disabled={isAddingMoney}
                              className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
                            >
                              {isAddingMoney ? 'Adding Funds...' : `Quick Add ₹${Math.ceil(grandTotal - walletBalance + 50)} & Continue`}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Quick Top-Up */}
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-extrabold text-slate-500 block">Quick Top-Up via Payment Gateway</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[200, 500, 1000, 2000].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleTopUpWallet(amt)}
                              disabled={isAddingMoney}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white text-xs font-bold font-mono transition-all cursor-pointer"
                            >
                              +₹{amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Price Breakdown & Total */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Items Subtotal</span>
                    <span className="font-mono">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Standard Express Delivery</span>
                    <span className="font-mono">
                      {appliedCoupon?.code === 'FREESHIP' ? '₹0.00 (FREE)' : `₹${effectiveDeliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-500 font-bold">
                      <span>Coupon Discount ({appliedCoupon.code})</span>
                      <span className="font-mono">-₹{couponDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-black">
                    <span>Total Amount Due</span>
                    <span className="text-amber-500 font-mono text-base font-black">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* 5. Dual Action Simulation Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={(e) => handleExecutePaymentAndOrder(e, false)}
                    disabled={isProcessingPayment || !isCurrentAreaServiced}
                    className="py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {!isCurrentAreaServiced ? (
                      <>
                        <MapPinOff className="w-3.5 h-3.5" />
                        <span>Area Outside 20km Radius</span>
                      </>
                    ) : isProcessingPayment && !simulateFail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pay ₹{grandTotal.toFixed(2)}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleExecutePaymentAndOrder(e, true)}
                    disabled={isProcessingPayment || !isCurrentAreaServiced}
                    className="py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-extrabold text-xs border border-rose-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Simulate Decline</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* Tracking Modal with Live Map & Flipkart-Style Timeline */}
      {activeTrackingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-4xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Order #{activeTrackingOrder.order_id} Live Delivery</h3>
                  <p className="text-xs text-slate-500">Courier navigation from {activeTrackingOrder.vendor_name} to your address</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimelineAnimKey(prev => prev + 1)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Replay</span>
                </button>
                <button onClick={() => setActiveTrackingOrder(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split Grid: Live Leaflet Map + Flowing Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left 7 cols: Interactive Leaflet Live Map */}
              <div className="lg:col-span-7 space-y-3">
                <LiveDeliveryMap
                  orderStatus={activeTrackingOrder.status}
                  chefLocation={activeTrackingOrder.chef_location || CHEF_AVATARS[activeTrackingOrder.vendor_email]?.coords || { lat: 12.9784, lng: 77.6408, locality: activeTrackingOrder.vendor_name }}
                  customerLocation={{ lat: currentCoords.lat, lng: currentCoords.lng, locality: primaryAddress }}
                  riderName={activeTrackingOrder.rider_name || 'David Rider'}
                  riderPhone={activeTrackingOrder.rider_phone || '+91 98450 12890'}
                  vehicleType="Ather 450X EV Scooter"
                  viewerRole="CUSTOMER"
                  isDarkMode={true}
                />
              </div>

              {/* Right 5 cols: Flipkart-Style Animated Flowing Timeline */}
              <div className="lg:col-span-5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Milestone Timeline</h4>
                <div key={timelineAnimKey} className="relative py-2 px-1 max-h-[380px] overflow-y-auto no-scrollbar">
                  {(() => {
                    const stages = getTimelineStages(activeTrackingOrder);
                    return stages.map((stage, idx) => {
                      const isLast = idx === stages.length - 1;
                      const isDone = stage.isDone;
                      const isNextDone = !isLast && stages[idx + 1].isDone;
                      const delayBase = idx * 0.45;

                      return (
                        <div key={stage.key} className="relative flex items-start gap-4 pb-6 last:pb-2">
                          {!isLast && (
                            <div className="absolute left-[13px] top-[26px] bottom-0 w-1 rounded-full z-0 overflow-hidden bg-slate-200 dark:bg-slate-800">
                              {isNextDone && (
                                <div
                                  className="w-full bg-gradient-to-b from-amber-500 to-orange-500"
                                  style={{ height: '100%' }}
                                />
                              )}
                            </div>
                          )}

                          <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            stage.isError
                              ? 'bg-rose-500 text-white'
                              : isDone
                              ? stage.key === 'DELIVERED'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-black'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 text-[11px]'
                          }`}>
                            {stage.isError ? <X className="w-3.5 h-3.5" /> : isDone ? <CheckCircle2 className="w-4 h-4" /> : <span>{idx + 1}</span>}
                          </div>

                          <div className="space-y-1 pt-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className={`text-xs font-black uppercase ${
                                stage.isError ? 'text-rose-500' : isDone ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                              }`}>
                                {stage.title}
                              </h5>
                              {stage.isActive && !isLast && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[9px] font-black animate-pulse">
                                  IN PROGRESS
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              {stage.desc}
                            </p>
                            {isDone && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {new Date(stage.time).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveTrackingOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs cursor-pointer"
              >
                Close Tracking
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Star Rating Review Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base">Rate Order #{reviewOrder.order_id}</h3>
              <button onClick={() => setReviewOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Chef Food Quality (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setVendorRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star className={`w-6 h-6 ${star <= vendorRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Courier Delivery Speed (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRiderRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star className={`w-6 h-6 ${star <= riderRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Feedback Comment</label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Delicious handcrafted food and quick doorstep delivery..."
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('chefhub_token');
                    await fetch(`/api/customer/orders/${reviewOrder.order_id}/review`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        vendor_rating: vendorRating,
                        rider_rating: riderRating,
                        comment: reviewComment
                      })
                    });
                    setReviewOrder(null);
                    fetchMyOrders();
                  } catch (e) {
                    setReviewOrder(null);
                  }
                }}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg cursor-pointer"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Order Modal */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-emerald-500/30 max-w-xl w-full space-y-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black">Order #{confirmedOrder.order_id} Confirmed!</h3>
              <p className="text-xs text-slate-500">
                Payment authorized. Escrow holds funds safely until your meal arrives.
              </p>
            </div>

            <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Address:</span>
                <span className="font-bold truncate max-w-[200px]">{confirmedOrder.delivery_address}</span>
              </div>
              {confirmedOrder.coupon_code && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Coupon Applied:</span>
                  <span>{confirmedOrder.coupon_code} (-₹{confirmedOrder.discount_amount})</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Total Paid:</span>
                <span className="text-amber-500">₹{Number(confirmedOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const toTrack = confirmedOrder;
                  setConfirmedOrder(null);
                  setActiveTrackingOrder(toTrack);
                }}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-lg cursor-pointer"
              >
                Track Order
              </button>
              <button
                onClick={() => setConfirmedOrder(null)}
                className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 border border-rose-500/30 max-w-sm w-full space-y-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl">
            <h3 className="font-black text-base">Cancel Order #{cancelModalOrder.order_id}?</h3>
            <p className="text-xs text-slate-500">
              Are you sure? Funds locked in escrow will be refunded back immediately.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => executeOrderCancellation(cancelModalOrder.order_id)}
                disabled={isCancellingOrder}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs cursor-pointer"
              >
                {isCancellingOrder ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Saved Card Modal (RBI Tokenization Compliance) */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-[85] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                  💳
                </div>
                <div>
                  <h4 className="font-black text-sm">Save New Payment Card</h4>
                  <p className="text-[10px] text-slate-500">RBI Tokenization & Data Protection Notice</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCard} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Bank Name / Card Nickname</label>
                <input
                  type="text"
                  required
                  value={newCardInput.bank}
                  onChange={(e) => setNewCardInput(prev => ({ ...prev, bank: e.target.value }))}
                  placeholder="e.g. HDFC Regalia or ICICI Sapphiro"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Card Number (16 Digits)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={newCardInput.cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                      setNewCardInput(prev => ({ ...prev, cardNumber: formatted }));
                    }}
                    placeholder="4532 8892 1042 8821"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Cardholder Full Name</label>
                <input
                  type="text"
                  required
                  value={newCardInput.holder}
                  onChange={(e) => setNewCardInput(prev => ({ ...prev, holder: e.target.value }))}
                  placeholder="Full name as printed on card"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={newCardInput.exp}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      setNewCardInput(prev => ({ ...prev, exp: val }));
                    }}
                    placeholder="08/29"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">CVV</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={newCardInput.cvv}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setNewCardInput(prev => ({ ...prev, cvv: val }));
                    }}
                    placeholder="•••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold tracking-widest outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-snug">
                🔒 Under Reserve Bank of India (RBI) tokenization guidelines, your card credentials are encrypted and stored safely on device. You can remove saved cards anytime.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Save Card to Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Auth / Sign In Modal for Guests & Role Switchers */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="relative max-w-lg w-full my-auto">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute -top-3 -right-3 z-50 w-8 h-8 rounded-full bg-slate-800 text-white border border-slate-700 flex items-center justify-center hover:bg-rose-500 transition-colors shadow-lg cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="overflow-hidden rounded-3xl shadow-2xl border border-slate-700">
              <CustomerAuthPage
                onLogin={(loggedInUser) => {
                  onLogin(loggedInUser);
                  setShowAuthModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
