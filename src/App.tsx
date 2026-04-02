import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import { databaseService } from './services/databaseService';
import { Product, MonthlySale, UserProfile } from './types';
import { Session } from '@supabase/supabase-js';
import { cn } from './lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Edit2, 
  Trash2, 
  LogOut, 
  LogIn, 
  ChevronDown, 
  ChevronUp,
  Image as ImageIcon,
  Video as VideoIcon,
  Tag as TagIcon,
  Package,
  DollarSign,
  X,
  Copy,
  Loader2,
  Calendar,
  Layers,
  Palette,
  Maximize,
  TrendingUp,
  Users,
  Shield,
  Mail,
  Lock,
  User as UserIcon,
  LayoutDashboard,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as XLSX from 'xlsx';

const productSchema = z.object({
  productCode: z.string().min(1, '产品编号为必填'),
  name: z.string().min(1, '产品名称为必填'),
  subName: z.string().optional(),
  category: z.string().min(1, '分类为必填'),
  description: z.string().optional(),
  tags: z.string().optional(),
  costPrice: z.number().min(0, '成本价格不能小于0'),
  agentPrice: z.number().min(0).optional(),
  domesticPrice: z.number().min(0).optional(),
  overseasPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0, '库存不能小于0'),
  size: z.string().optional(),
  pieces: z.number().int().min(0).optional(),
  color: z.string().optional(),
  releaseDate: z.string().optional(),
  monthlySales: z.array(z.object({
    yearMonth: z.string().regex(/^\d{4}-\d{2}$/, '格式必须为 YYYY-MM'),
    quantity: z.number().int().min(0)
  })).optional(),
  photos: z.array(z.object({ url: z.string().url('无效的图片链接') })).optional(),
  videos: z.array(z.object({ url: z.string().url('无效的视频链接') })).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('全部');
  const [sortBy, setSortBy] = useState<keyof Product>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'products' | 'users'>('products');

  const [exchangeRate, setExchangeRate] = useState<number>(7.2); // Default fallback

  // Fetch exchange rate
  useEffect(() => {
    async function fetchRate() {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if (data && data.rates && data.rates.CNY) {
          setExchangeRate(data.rates.CNY);
        }
      } catch (error) {
        console.error("Failed to fetch exchange rate:", error);
      }
    }
    fetchRate();
  }, []);

  // Auth listener
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleAuthChange(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = async (session: Session | null) => {
    if (session?.user) {
      setUser(session.user);
      // Fetch profile from our user_profiles table
      let profile = await databaseService.getUserProfile(session.user.id);
      
      if (!profile && session.user.email) {
        // Try to find by email (for migrated users)
        const existingProfile = await databaseService.getUserProfileByEmail(session.user.email);
        if (existingProfile) {
          // Link the old profile to the new Supabase UID
          profile = {
            ...existingProfile,
            uid: session.user.id
          };
          await databaseService.createUserProfile(profile);
          // Delete the old record if the ID changed
          if (existingProfile.uid !== session.user.id) {
            try {
              await databaseService.deleteUserProfile(existingProfile.uid);
            } catch (e) {
              console.error("Failed to delete old profile:", e);
            }
          }
        }
      }

      if (profile) {
        setUserProfile(profile);
      } else {
        // Auto-create profile for new Supabase users
        const newProfile: UserProfile = {
          uid: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
          role: (session.user.email === 'john@greatidea.tw' || session.user.email === 'wesleytw723@gmail.com') ? 'admin' : 'viewer',
          createdAt: new Date().toISOString()
        };
        await databaseService.createUserProfile(newProfile);
        setUserProfile(newProfile);
      }
    } else {
      setUser(null);
      setUserProfile(null);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!supabase) {
      alert('Supabase 尚未配置。請在 AI Studio 的「Settings」選單中設定 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Login Error: ", error);
      alert(`登入失敗：${error.message}`);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout Error: ", error);
    }
  };



  const fetchProducts = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await databaseService.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError("無法載入商品清單。這通常是因為 Supabase 的 RLS 策略發生了無限遞迴錯誤。請檢查您的資料庫策略。");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Products listener
  useEffect(() => {
    if (!user) {
      setProducts([]);
      return;
    }

    // Initial fetch
    fetchProducts();

    // Supabase Realtime
    const unsubscribe = databaseService.subscribeToProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });

    return () => {
      unsubscribe.then(unsub => unsub());
    };
  }, [user]);

  const dynamicCategories = useMemo(() => {
    const categories = new Set(products.map(p => p.category));
    return Array.from(categories).sort();
  }, [products]);

  const allExistingTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [products]);

  const calculateTotalSales = (sales: MonthlySale[]) => {
    return sales.reduce((sum, sale) => sum + sale.quantity, 0);
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesSearch = 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory === '全部' || p.category === filterCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        
        // Handle dates
        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
          const dateA = valA?.toDate ? valA.toDate().getTime() : new Date(valA).getTime();
          const dateB = valB?.toDate ? valB.toDate().getTime() : new Date(valB).getTime();
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        
        return 0;
      });
  }, [products, searchTerm, filterCategory, sortBy, sortOrder]);

  const handleExport = (format: 'csv' | 'xlsx', selectedColumns: string[]) => {
    const dataToExport = filteredProducts.map(p => {
      const row: any = {};
      if (selectedColumns.includes('产品编号')) row['产品编号'] = p.productCode;
      if (selectedColumns.includes('名称')) row['名称'] = p.name;
      if (selectedColumns.includes('子产品名称')) row['子产品名称'] = p.subName || '';
      if (selectedColumns.includes('分类')) row['分类'] = p.category;
      if (selectedColumns.includes('描述')) row['描述'] = p.description;
      if (selectedColumns.includes('尺寸')) row['尺寸'] = p.size;
      if (selectedColumns.includes('片数')) row['片数'] = p.pieces;
      if (selectedColumns.includes('颜色')) row['颜色'] = p.color;
      if (selectedColumns.includes('上市日期')) row['上市日期'] = p.releaseDate;
      if (selectedColumns.includes('标签')) row['标签'] = p.tags.join(', ');
      if (selectedColumns.includes('成本价格')) row['成本价格'] = p.costPrice;
      if (selectedColumns.includes('代理商价格')) row['代理商价格'] = p.agentPrice || 0;
      if (selectedColumns.includes('国内售价')) row['国内售价'] = p.domesticPrice || 0;
      if (selectedColumns.includes('海外售价')) row['海外售价'] = p.overseasPrice || 0;
      if (selectedColumns.includes('库存')) row['库存'] = p.stock;
      if (selectedColumns.includes('总销量')) row['总销量'] = calculateTotalSales(p.monthlySales);
      if (selectedColumns.includes('图片链接')) row['图片链接'] = p.photos.join('; ');
      if (selectedColumns.includes('视频链接')) row['视频链接'] = p.videos.join('; ');
      if (selectedColumns.includes('建立时间')) {
        const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        row['建立时间'] = date.toLocaleString();
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, `products_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const dataBuffer = evt.target?.result;
          const wb = XLSX.read(dataBuffer, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          let successCount = 0;
          let errorCount = 0;

          for (const rawRow of data as any[]) {
            try {
              // Normalize keys (trim and remove potential hidden characters)
              const row: any = {};
              Object.keys(rawRow).forEach(key => {
                row[key.trim()] = rawRow[key];
              });

              // Map spreadsheet columns to Product object
              const productData: any = {
                productCode: String(row['产品编号'] || row['產品編號'] || '').trim(),
                name: String(row['名称'] || row['名稱'] || '').trim(),
                subName: String(row['子产品名称'] || row['子產品名稱'] || '').trim(),
                category: String(row['分类'] || row['分類'] || '未分類').trim(),
                description: String(row['描述'] || '').trim(),
                size: String(row['尺寸'] || '').trim(),
                pieces: Number(row['片数'] || row['片數']) || 0,
                color: String(row['颜色'] || row['顏色'] || '').trim(),
                releaseDate: String(row['上市日期'] || '').trim(),
                tags: row['标签'] || row['標籤'] ? String(row['标签'] || row['標籤']).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
                costPrice: Number(row['成本价格'] || row['成本價格']) || 0,
                agentPrice: Number(row['代理商价格'] || row['代理商價格']) || 0,
                domesticPrice: Number(row['国内售价'] || row['國內售價']) || 0,
                overseasPrice: Number(row['海外售价'] || row['海外售價']) || 0,
                stock: Number(row['库存'] || row['庫存']) || 0,
                photos: row['图片链接'] || row['圖片連結'] ? String(row['图片链接'] || row['圖片連結']).split(';').map((p: string) => p.trim()).filter(Boolean) : [],
                videos: row['视频链接'] || row['視頻連結'] ? String(row['视频链接'] || row['視頻連結']).split(';').map((v: string) => v.trim()).filter(Boolean) : [],
                monthlySales: [],
                createdBy: user?.id || ''
              };

              if (!productData.productCode || !productData.name) {
                console.warn('Skipping row due to missing required fields:', row);
                errorCount++;
                continue;
              }

              await databaseService.addProduct(productData);
              successCount++;
            } catch (err) {
              console.error('Import row error:', err);
              errorCount++;
            }
          }

          alert(`导入完成！\n成功：${successCount} 笔\n失败：${errorCount} 笔`);
          fetchProducts();
        } catch (err) {
          console.error('File processing error:', err);
          alert('文件处理失败，请确保格式正确。');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Import error:', error);
      alert('导入失败。');
      setIsImporting(false);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此产品吗？')) {
      try {
        await databaseService.deleteProduct(id);
      } catch (error) {
        console.error("Delete Error: ", error);
        alert('删除失败');
      }
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCopy = (product: Product) => {
    // Copy the product but remove the ID and productCode
    const { id, productCode, ...rest } = product;
    setEditingProduct({ ...product, id: '', productCode: '' });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  const isAdmin = userProfile?.role === 'admin';
  const isViewer = userProfile?.role === 'viewer';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">龙零产品数据库</h1>
          </div>

          <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('products')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'products' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              产品管理
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'users' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Users className="w-4 h-4" />
                用户管理
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt={userProfile?.displayName || ''} className="w-8 h-8 rounded-full border border-gray-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                  {userProfile?.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-medium leading-none">{userProfile?.displayName || user.email?.split('@')[0]}</span>
                <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <Shield className="w-2 h-2" />
                  {userProfile?.role === 'admin' ? '超级管理员' : '浏览者'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="登出"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-semibold">資料載入錯誤</p>
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-1 opacity-80">解決方法：這通常是因為 Supabase 的 RLS 策略發生了無限遞迴。請前往 Supabase SQL Editor 檢查 user_profiles 表的策略，確保沒有在策略中直接查詢該表本身。</p>
            </div>
          </div>
        )}
        {activeTab === 'products' ? (
          <>
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between">
              <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索产品名称、编号或标签..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <button
                  onClick={fetchProducts}
                  disabled={isRefreshing}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50"
                  title="重新整理"
                >
                  <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
                </button>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="全部">所有分类</option>
                    {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {!isViewer && (
                  <>
                    <input
                      type="file"
                      id="import-excel"
                      className="hidden"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleImport}
                      disabled={isImporting}
                    />
                    <label
                      htmlFor="import-excel"
                      className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer",
                        isImporting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      导入 Excel
                    </label>
                    <button
                      onClick={() => setIsExportModalOpen(true)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                    >
                      <Download className="w-4 h-4" />
                      导出 Excel
                    </button>
                  </>
                )}
                {!isViewer && (
                  <button
                    onClick={openAddModal}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-lg shadow-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    新增产品
                  </button>
                )}
              </div>
            </div>

            {/* Table/List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <button 
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            if (sortBy === 'productCode') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('productCode'); setSortOrder('asc'); }
                          }}
                        >
                          产品编号 {sortBy === 'productCode' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <button 
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('name'); setSortOrder('asc'); }
                          }}
                        >
                          产品名称 {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">预览</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">分类</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <button 
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            if (sortBy === 'stock') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            else { setSortBy('stock'); setSortOrder('asc'); }
                          }}
                        >
                          库存 {sortBy === 'stock' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">总销量</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">售价 (国内/海外)</th>
                      {!isViewer && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 text-right shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">操作</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {product.productCode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{product.name}</span>
                              {product.subName && (
                                <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                  {product.subName}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.tags.map(tag => (
                                <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <TagIcon className="w-2 h-2" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {product.photos && product.photos.length > 0 ? (
                              <img 
                                src={product.photos[0]} 
                                alt={product.name} 
                                className="w-10 h-10 object-cover rounded-lg border border-gray-100 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                            {product.videos && product.videos.length > 0 && (
                              <div className="w-10 h-10 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center">
                                <VideoIcon className="w-4 h-4 text-blue-400" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{product.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-sm font-semibold",
                            product.stock <= 5 ? "text-red-600" : "text-gray-700"
                          )}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                            <TrendingUp className="w-4 h-4" />
                            {calculateTotalSales(product.monthlySales)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-sm">
                            <span className="text-gray-900">¥ {product.domesticPrice?.toLocaleString()}</span>
                            <span className="text-gray-400 text-xs">US$ {product.overseasPrice?.toLocaleString()} (≈ ¥{(product.overseasPrice * exchangeRate).toFixed(2)})</span>
                          </div>
                        </td>
                        {!isViewer && (
                          <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-gray-50 z-10 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <button 
                                onClick={() => handleCopy(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="复制产品"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => openEditModal(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="编辑产品"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="删除产品"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={isViewer ? 6 : 7} className="px-6 py-12 text-center text-gray-500">
                          找不到符合条件的产品
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <UserManagementView />
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <ProductModal 
            product={editingProduct} 
            onClose={() => setIsModalOpen(false)} 
            user={user}
            categories={dynamicCategories}
            existingTags={allExistingTags}
            exchangeRate={exchangeRate}
          />
        )}
        {isExportModalOpen && (
          <ExportModal 
            onClose={() => setIsExportModalOpen(false)}
            onExport={(format, columns) => {
              handleExport(format, columns);
              setIsExportModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const EXPORT_COLUMNS = [
  '产品编号', '名称', '子产品名称', '分类', '描述', '尺寸', '片数', '颜色', '上市日期', '标签',
  '成本价格', '代理商价格', '国内售价', '海外售价', '库存', '总销量', '图片链接', '视频链接', '建立时间'
];

function ExportModal({ onClose, onExport }: { onClose: () => void, onExport: (format: 'csv' | 'xlsx', columns: string[]) => void }) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS);

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const toggleAll = () => {
    if (selectedColumns.length === EXPORT_COLUMNS.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(EXPORT_COLUMNS);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">导出设置</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">选择要导出的栏位</span>
            <button 
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:underline"
            >
              {selectedColumns.length === EXPORT_COLUMNS.length ? '取消全选' : '全选'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {EXPORT_COLUMNS.map(col => (
              <label key={col} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={selectedColumns.includes(col)}
                  onChange={() => toggleColumn(col)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">{col}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-white rounded-xl transition-all"
          >
            取消
          </button>
          <button
            onClick={() => onExport('csv', selectedColumns)}
            disabled={selectedColumns.length === 0}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            导出 CSV
          </button>
          <button
            onClick={() => onExport('xlsx', selectedColumns)}
            disabled={selectedColumns.length === 0}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            导出 Excel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: () => void }) {
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName
            }
          }
        });
        if (error) throw error;
        alert('注册成功！請檢查郵箱驗證（如果啟用了驗證）。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('登录失败：账号或密码错误。如果您是旧版用户，请先点击下方的“去注册”创建一个新账号（密码不会从旧版迁移）。');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">龙零产品数据库</h1>
          <p className="text-gray-500">请选择登录方式</p>
        </div>

        {isEmailLogin ? (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">姓名</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegistering ? '注册账号' : '登录'}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button 
                type="button" 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-blue-600 hover:underline"
              >
                {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsEmailLogin(false)}
                className="text-gray-500 hover:underline"
              >
                返回其他方式
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <button
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              使用 Google 登录
            </button>
            <button
              onClick={() => setIsEmailLogin(true)}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-200"
            >
              <Mail className="w-5 h-5" />
              使用账号密码登录
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function UserManagementView() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await databaseService.getAllUserProfiles();
        setUsers(data);
      } catch (err) {
        console.error("Fetch Users Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);

    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            display_name: newDisplayName,
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('User creation failed');

      // Create user profile in Supabase
      const newUserProfile: UserProfile = {
        uid: data.user.id,
        email: newEmail,
        displayName: newDisplayName,
        role: newRole,
        createdAt: new Date().toISOString()
      };
      
      await databaseService.createUserProfile(newUserProfile);
      
      alert('用户已创建。请注意，Supabase 可能会自动登录新用户，您可能需要重新登录管理员账号。');
      
      setIsAddingUser(false);
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('viewer');
      
      // Refresh list
      const updatedUsers = await databaseService.getAllUserProfiles();
      setUsers(updatedUsers);
    } catch (err: any) {
      let errorMessage = err.message;
      if (err.message.includes('rate limit exceeded')) {
        errorMessage = '新增频率過快（每小時郵件限制已達上限）。請前往 Supabase 後台 Authentication > Settings > Rate Limits 調高 "Max Emails per Hour" 限制。';
      }
      setAddError(errorMessage);
    } finally {
      setAddLoading(false);
    }
  };

  const updateRole = async (uid: string, newRole: 'admin' | 'viewer') => {
    try {
      await databaseService.updateUserProfile(uid, { role: newRole });
      // Refresh list
      const updatedUsers = await databaseService.getAllUserProfiles();
      setUsers(updatedUsers);
    } catch (err) {
      console.error("Update Role Error:", err);
      alert('更新角色失败');
    }
  };

  const handleDeleteUser = async (uid: string, email: string, role: string) => {
    // 1. Protect main admin
    if (email === 'john@greatidea.tw') {
      alert('不能删除主管理员。');
      return;
    }

    // 2. Ensure at least one admin remains
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (role === 'admin' && adminCount <= 1) {
      alert('必须保留至少一位管理员。');
      return;
    }

    if (confirmDeleteUid === uid) {
      try {
        await databaseService.deleteUserProfile(uid);
        setConfirmDeleteUid(null);
        // Refresh list
        const updatedUsers = await databaseService.getAllUserProfiles();
        setUsers(updatedUsers);
      } catch (err) {
        console.error("Delete User Error:", err);
        alert('删除用户失败');
      }
    } else {
      if (confirm(`确定要删除用户 ${email} 吗？\n\n注意：此操作仅删除数据库中的个人资料。您仍需前往 Supabase 后台的 Authentication > Users 手动删除该账号，否则无法使用相同邮箱重新注册。`)) {
        setConfirmDeleteUid(uid);
      }
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      {/* Add User Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            用户管理
          </h2>
          <button
            onClick={() => setIsAddingUser(!isAddingUser)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium text-sm"
          >
            {isAddingUser ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingUser ? '取消新增' : '新增管理員/瀏覽者'}
          </button>
        </div>

        <AnimatePresence>
          {isAddingUser && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleAddUser} className="p-6 bg-gray-50 border-b border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">姓名</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">邮箱</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">密码</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">权限</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                    >
                      <option value="viewer">浏览者 (只能查看)</option>
                      <option value="admin">管理员 (完全权限)</option>
                    </select>
                  </div>
                </div>
                {addError && <p className="text-xs text-red-500">{addError}</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium disabled:opacity-50"
                  >
                    {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    确认新增
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">用户信息</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">邮箱</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">角色权限</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">注册时间</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right sticky right-0 bg-gray-50 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {u.displayName?.charAt(0) || u.email?.charAt(0)}
                      </div>
                      <span className="font-medium">{u.displayName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      u.role === 'admin' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {u.role === 'admin' ? '超级管理员' : '浏览者'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString() : new Date(u.createdAt).toLocaleDateString()) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-gray-50 z-10 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        className="text-xs border border-gray-200 rounded-lg p-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={u.role}
                        onChange={(e) => updateRole(u.uid, e.target.value as any)}
                        disabled={u.email === 'john@greatidea.tw'} // Prevent demoting the main admin
                      >
                        <option value="viewer">设为浏览者</option>
                        <option value="admin">设為管理員</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(u.uid, u.email, u.role)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-medium",
                          confirmDeleteUid === u.uid 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                        )}
                        title={confirmDeleteUid === u.uid ? "点击确认删除" : "删除用户"}
                        disabled={u.email === 'john@greatidea.tw'}
                      >
                        {confirmDeleteUid === u.uid ? "确认删除?" : <Trash2 className="w-4 h-4" />}
                      </button>
                      {confirmDeleteUid === u.uid && (
                        <button 
                          onClick={() => setConfirmDeleteUid(null)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ 
  product, 
  onClose, 
  user, 
  categories, 
  existingTags,
  exchangeRate
}: { 
  product: Product | null, 
  onClose: () => void, 
  user: UserProfile,
  categories: string[],
  existingTags: string[],
  exchangeRate: number
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      productCode: product.productCode,
      name: product.name,
      subName: product.subName || '',
      category: product.category,
      description: product.description,
      tags: product.tags.join(', '),
      costPrice: product.costPrice,
      agentPrice: product.agentPrice,
      domesticPrice: product.domesticPrice,
      overseasPrice: product.overseasPrice,
      stock: product.stock,
      size: product.size,
      pieces: product.pieces,
      color: product.color,
      releaseDate: product.releaseDate,
      monthlySales: product.monthlySales || [],
      photos: product.photos.map(url => ({ url })),
      videos: product.videos.map(url => ({ url })),
    } : {
      productCode: '',
      name: '',
      subName: '',
      category: '',
      stock: 0,
      costPrice: 0,
      monthlySales: [],
      photos: [],
      videos: []
    }
  });

  const { fields: photoFields, append: appendPhoto, remove: removePhoto } = useFieldArray({ control, name: "photos" });
  const { fields: videoFields, append: appendVideo, remove: removeVideo } = useFieldArray({ control, name: "videos" });
  const { fields: salesFields, append: appendSale, remove: removeSale } = useFieldArray({ control, name: "monthlySales" });

  const currentTags = watch('tags') || '';
  const currentCategory = watch('category') || '';

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      // Unique productCode check
      const isUnique = await databaseService.checkProductCodeUnique(data.productCode, product?.id);
      
      if (!isUnique) {
        alert('产品编号已存在，请使用唯一编号。');
        setIsSubmitting(false);
        return;
      }

      const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t !== '') : [];
      const photos = data.photos?.map(p => p.url) || [];
      const videos = data.videos?.map(v => v.url) || [];

      if (product && product.id) {
        await databaseService.updateProduct(product.id, {
          ...data,
          tags,
          photos,
          videos,
        });
      } else {
        await databaseService.addProduct({
          ...data,
          id: crypto.randomUUID(),
          tags,
          photos,
          videos,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user.uid,
        } as Product);
      }
      alert('产品已成功保存！');
      window.location.reload();
    } catch (error) {
      console.error("Submit Error: ", error);
      alert('提交失败，请检查控制台。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = (tag: string) => {
    const tags = currentTags.split(',').map(t => t.trim()).filter(t => t !== '');
    if (!tags.includes(tag)) {
      tags.push(tag);
      setValue('tags', tags.join(', '));
    }
  };

  const totalSales = (watch('monthlySales') || []).reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {product ? '编辑产品' : '新增产品'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-8">
          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" /> 基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">产品编号 *</label>
                <input
                  {...register('productCode')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如: PRD-001"
                />
                {errors.productCode && <p className="text-xs text-red-500">{errors.productCode.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">产品名称 *</label>
                <input
                  {...register('name')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">子产品名称</label>
                <input
                  {...register('subName')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="可留空"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">分类 *</label>
                <div className="relative">
                  <input
                    {...register('category')}
                    list="category-list"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="输入或选择分类"
                  />
                  <datalist id="category-list">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">库存 *</label>
                <input
                  type="number"
                  {...register('stock', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.stock && <p className="text-xs text-red-500">{errors.stock.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">上市日期</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    {...register('releaseDate')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Maximize className="w-4 h-4" /> 尺寸
                </label>
                <input
                  {...register('size')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如: 30x40cm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> 片数
                </label>
                <input
                  type="number"
                  {...register('pieces', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> 颜色
                </label>
                <input
                  {...register('color')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如: 经典黑"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-sm font-medium text-gray-700">描述</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-sm font-medium text-gray-700">标签 (以逗号分隔)</label>
                <input
                  {...register('tags')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如: 热销, 夏季, 限量"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-gray-400 self-center">常用标签:</span>
                  {existingTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="text-[10px] bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 px-2 py-1 rounded-full transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Monthly Sales */}
          <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">每月销售数量</h3>
                  <p className="text-xs text-gray-500">总销量: <span className="font-bold text-blue-600">{totalSales}</span></p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => appendSale({ yearMonth: new Date().toISOString().slice(0, 7), quantity: 0 })}
                className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all font-semibold flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3 h-3" /> 新增月份
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {salesFields.map((field, index) => (
                <div key={field.id} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex items-center gap-2">
                  <input
                    type="month"
                    {...register(`monthlySales.${index}.yearMonth`)}
                    className="flex-1 text-xs border-none focus:ring-0 p-0 font-medium text-gray-700"
                  />
                  <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                  <input
                    type="number"
                    {...register(`monthlySales.${index}.quantity`, { valueAsNumber: true })}
                    className="w-16 text-xs border-none focus:ring-0 p-0 font-bold text-blue-600 text-right"
                    placeholder="数量"
                  />
                  <button 
                    type="button" 
                    onClick={() => removeSale(index)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {salesFields.length === 0 && (
                <div className="col-span-full py-4 text-center text-xs text-gray-400 italic">
                  尚未设定销售数据
                </div>
              )}
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> 价格设定
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">成本价格 *</label>
                <input type="number" {...register('costPrice', { valueAsNumber: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                {errors.costPrice && <p className="text-[10px] text-red-500">{errors.costPrice.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">代理商价格</label>
                <input type="number" {...register('agentPrice', { valueAsNumber: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">国内售价</label>
                <input type="number" {...register('domesticPrice', { valueAsNumber: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">海外售价 (USD)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    {...register('overseasPrice', { valueAsNumber: true })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                  <div className="mt-1 text-[10px] text-gray-400">
                    约合人民币: <span className="font-bold text-blue-600">¥{(watch('overseasPrice') * exchangeRate).toFixed(2)}</span>
                    <span className="ml-2">(当前汇率: {exchangeRate.toFixed(4)})</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Media */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> 图片链接
                </h3>
                <button 
                  type="button" 
                  onClick={() => appendPhoto({ url: '' })}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 新增链接
                </button>
              </div>
              <div className="space-y-3">
                {photoFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <input
                      {...register(`photos.${index}.url` as const)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="https://..."
                    />
                    {watch(`photos.${index}.url`) && (
                      <div className="w-10 h-10 rounded-lg border border-gray-100 overflow-hidden flex-shrink-0">
                        <img 
                          src={watch(`photos.${index}.url`)} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => removePhoto(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <VideoIcon className="w-4 h-4" /> 视频链接
                </h3>
                <button 
                  type="button" 
                  onClick={() => appendVideo({ url: '' })}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 新增链接
                </button>
              </div>
              <div className="space-y-3">
                {videoFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <input
                      {...register(`videos.${index}.url` as const)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="https://..."
                    />
                    {watch(`videos.${index}.url`) && (
                      <div className="w-10 h-10 rounded-lg border border-blue-100 bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <VideoIcon className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => removeVideo(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {product ? '更新产品' : '储存产品'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
