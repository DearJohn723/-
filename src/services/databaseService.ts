import { supabase } from '../supabase';
import { Product, UserProfile } from '../types';

export const databaseService = {
  // Products
  async getProducts() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (data as any[]).map(p => ({
      id: p.id,
      productCode: p.product_code,
      name: p.name,
      subName: p.sub_name,
      category: p.category,
      description: p.description,
      tags: p.tags,
      costPrice: Number(p.cost_price),
      agentPrice: Number(p.agent_price),
      domesticPrice: Number(p.domestic_price),
      overseasPrice: Number(p.overseas_price),
      stock: p.stock,
      size: p.size,
      pieces: p.pieces,
      color: p.color,
      releaseDate: p.release_date,
      monthlySales: p.monthly_sales,
      photos: p.photos,
      videos: p.videos,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      createdBy: p.created_by
    })) as Product[];
  },

  async subscribeToProducts(callback: (products: Product[]) => void) {
    if (!supabase) return () => {};
    const subscription = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const products = await this.getProducts();
        callback(products);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  },

  async addProduct(product: Product) {
    if (!supabase) throw new Error('Supabase not configured');
    const formattedProduct = {
      id: product.id,
      product_code: product.productCode,
      name: product.name,
      sub_name: product.subName,
      category: product.category,
      description: product.description,
      tags: product.tags,
      cost_price: product.costPrice,
      agent_price: product.agentPrice,
      domestic_price: product.domesticPrice,
      overseas_price: product.overseasPrice,
      stock: product.stock,
      size: product.size,
      pieces: product.pieces,
      color: product.color,
      release_date: product.releaseDate,
      monthly_sales: product.monthlySales,
      photos: product.photos,
      videos: product.videos,
      created_by: product.createdBy,
      created_at: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
      updated_at: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt
    };

    const { data, error } = await supabase
      .from('products')
      .upsert([formattedProduct])
      .select()
      .single();
    
    if (error) throw error;
    return data as Product;
  },

  async updateProduct(id: string, product: Partial<Product>) {
    if (!supabase) throw new Error('Supabase not configured');
    const formattedProduct: any = {};
    if (product.productCode) formattedProduct.product_code = product.productCode;
    if (product.name) formattedProduct.name = product.name;
    if (product.subName) formattedProduct.sub_name = product.subName;
    if (product.category) formattedProduct.category = product.category;
    if (product.description) formattedProduct.description = product.description;
    if (product.tags) formattedProduct.tags = product.tags;
    if (product.costPrice) formattedProduct.cost_price = product.costPrice;
    if (product.agentPrice) formattedProduct.agent_price = product.agentPrice;
    if (product.domesticPrice) formattedProduct.domestic_price = product.domesticPrice;
    if (product.overseasPrice) formattedProduct.overseas_price = product.overseasPrice;
    if (product.stock !== undefined) formattedProduct.stock = product.stock;
    if (product.size) formattedProduct.size = product.size;
    if (product.pieces !== undefined) formattedProduct.pieces = product.pieces;
    if (product.color) formattedProduct.color = product.color;
    if (product.releaseDate) formattedProduct.release_date = product.releaseDate;
    if (product.monthlySales) formattedProduct.monthly_sales = product.monthlySales;
    if (product.photos) formattedProduct.photos = product.photos;
    if (product.videos) formattedProduct.videos = product.videos;
    formattedProduct.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('products')
      .update(formattedProduct)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Product;
  },

  async deleteProduct(id: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async checkProductCodeUnique(productCode: string, excludeId?: string) {
    if (!supabase) return true;
    let query = supabase
      .from('products')
      .select('id')
      .eq('product_code', productCode);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data.length === 0;
  },

  // Users
  async getUserProfile(uid: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', uid)
      .single();
    
    if (error) return null;
    return data as UserProfile;
  },

  async createUserProfile(profile: UserProfile) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert([{
        id: profile.uid,
        email: profile.email,
        display_name: profile.displayName,
        role: profile.role,
        created_at: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateUserProfile(uid: string, profile: Partial<UserProfile>) {
    if (!supabase) throw new Error('Supabase not configured');
    const updates: any = {};
    if (profile.displayName) updates.display_name = profile.displayName;
    if (profile.role) updates.role = profile.role;
    if (profile.email) updates.email = profile.email;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', uid)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAllUserProfiles() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data as any[]).map(u => ({
      uid: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
      createdAt: u.created_at
    })) as UserProfile[];
  }
};
