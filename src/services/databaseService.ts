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
    
    if (error) {
      console.error("Supabase getProducts Error:", error);
      throw error;
    }
    
    if (!data) return [];
    
    return (data as any[]).map(p => ({
      id: p.id,
      productCode: p.product_code || '',
      name: p.name || '',
      subName: p.sub_name || '',
      category: p.category || '未分類',
      description: p.description || '',
      tags: p.tags || [],
      factoryPrice: Number(p.cost_price || p.factory_price || 0),
      agentPriceLevel1: Number(p.agent_price || 0),
      agentPriceLevel2: Number(p.agent_price_level_2 || 0),
      agentPriceLevel3: Number(p.agent_price_level_3 || 0),
      dropshippingPrice: Number(p.dropshipping_price || 0),
      domesticPrice: Number(p.domestic_price || 0),
      overseasPrice: Number(p.overseas_price || 0),
      stock: p.stock || 0,
      size: p.size || '',
      netWeight: p.weight || '',
      grossWeight: p.gross_weight || '',
      packagingSize: p.packaging_size || '',
      boxQuantity: p.box_quantity || 0,
      shippingBoxSize: p.shipping_box_size || '',
      shippingBoxWeight: p.shipping_box_weight || 0,
      shippingBoxVolume: p.shipping_box_volume || 0,
      type: p.type || '',
      pieces: p.pieces || 0,
      color: p.color || '',
      releaseDate: p.release_date || '',
      monthlySales: p.monthly_sales || [],
      photos: p.photos || [],
      videos: p.videos || [],
      createdAt: p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || new Date().toISOString(),
      createdBy: p.created_by || ''
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

  async addProduct(product: Partial<Product>) {
    if (!supabase) throw new Error('Supabase not configured');
    const formattedProduct: any = {
      product_code: product.productCode,
      name: product.name,
      sub_name: product.subName,
      category: product.category,
      description: product.description,
      tags: product.tags,
      cost_price: product.factoryPrice,
      agent_price: product.agentPriceLevel1,
      agent_price_level_2: product.agentPriceLevel2,
      agent_price_level_3: product.agentPriceLevel3,
      dropshipping_price: product.dropshippingPrice,
      domestic_price: product.domesticPrice,
      overseas_price: product.overseasPrice,
      stock: product.stock,
      size: product.size,
      weight: product.netWeight,
      gross_weight: product.grossWeight,
      packaging_size: product.packagingSize,
      box_quantity: product.boxQuantity,
      shipping_box_size: product.shippingBoxSize,
      shipping_box_weight: product.shippingBoxWeight,
      shipping_box_volume: product.shippingBoxVolume,
      type: product.type,
      pieces: product.pieces,
      color: product.color,
      release_date: product.releaseDate,
      monthly_sales: product.monthlySales,
      photos: product.photos,
      videos: product.videos,
      created_by: product.createdBy,
    };

    if (product.id) {
      formattedProduct.id = product.id;
    } else {
      // Generate a new UUID if not provided
      formattedProduct.id = crypto.randomUUID();
    }
    if (product.createdAt) {
      formattedProduct.created_at = product.createdAt;
    } else {
      formattedProduct.created_at = new Date().toISOString();
    }
    
    if (product.updatedAt) {
      formattedProduct.updated_at = product.updatedAt;
    } else {
      formattedProduct.updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('products')
      .insert([formattedProduct])
      .select()
      .single();
    
    if (error) {
      console.error('Add Product Error:', error);
      throw error;
    }
    return data as Product;
  },

  async updateProduct(id: string, product: Partial<Product>) {
    if (!supabase) throw new Error('Supabase not configured');
    const formattedProduct: any = {};
    if (product.productCode !== undefined) formattedProduct.product_code = product.productCode;
    if (product.name !== undefined) formattedProduct.name = product.name;
    if (product.subName !== undefined) formattedProduct.sub_name = product.subName;
    if (product.category !== undefined) formattedProduct.category = product.category;
    if (product.description !== undefined) formattedProduct.description = product.description;
    if (product.tags !== undefined) formattedProduct.tags = product.tags;
    if (product.factoryPrice !== undefined) formattedProduct.cost_price = product.factoryPrice;
    if (product.agentPriceLevel1 !== undefined) formattedProduct.agent_price = product.agentPriceLevel1;
    if (product.agentPriceLevel2 !== undefined) formattedProduct.agent_price_level_2 = product.agentPriceLevel2;
    if (product.agentPriceLevel3 !== undefined) formattedProduct.agent_price_level_3 = product.agentPriceLevel3;
    if (product.dropshippingPrice !== undefined) formattedProduct.dropshipping_price = product.dropshippingPrice;
    if (product.domesticPrice !== undefined) formattedProduct.domestic_price = product.domesticPrice;
    if (product.overseasPrice !== undefined) formattedProduct.overseas_price = product.overseasPrice;
    if (product.stock !== undefined) formattedProduct.stock = product.stock;
    if (product.size !== undefined) formattedProduct.size = product.size;
    if (product.netWeight !== undefined) formattedProduct.weight = product.netWeight;
    if (product.grossWeight !== undefined) formattedProduct.gross_weight = product.grossWeight;
    if (product.packagingSize !== undefined) formattedProduct.packaging_size = product.packagingSize;
    if (product.boxQuantity !== undefined) formattedProduct.box_quantity = product.boxQuantity;
    if (product.shippingBoxSize !== undefined) formattedProduct.shipping_box_size = product.shippingBoxSize;
    if (product.shippingBoxWeight !== undefined) formattedProduct.shipping_box_weight = product.shippingBoxWeight;
    if (product.shippingBoxVolume !== undefined) formattedProduct.shipping_box_volume = product.shippingBoxVolume;
    if (product.type !== undefined) formattedProduct.type = product.type;
    if (product.pieces !== undefined) formattedProduct.pieces = product.pieces;
    if (product.color !== undefined) formattedProduct.color = product.color;
    if (product.releaseDate !== undefined) formattedProduct.release_date = product.releaseDate;
    if (product.monthlySales !== undefined) formattedProduct.monthly_sales = product.monthlySales;
    if (product.photos !== undefined) formattedProduct.photos = product.photos;
    if (product.videos !== undefined) formattedProduct.videos = product.videos;
    formattedProduct.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('products')
      .update(formattedProduct)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Update Product Error:', error);
      throw error;
    }
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
      .maybeSingle();
    
    if (error) return null;
    if (!data) return null;
    return {
      uid: data.id,
      email: data.email,
      displayName: data.display_name,
      role: data.role,
      createdAt: data.created_at
    } as UserProfile;
  },

  async getUserProfileByEmail(email: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) return null;
    if (!data) return null;
    return {
      uid: data.id,
      email: data.email,
      displayName: data.display_name,
      role: data.role,
      createdAt: data.created_at
    } as UserProfile;
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
        created_at: profile.createdAt
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

  async deleteUserProfile(uid: string) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', uid);
    
    if (error) throw error;
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
