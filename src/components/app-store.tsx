import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

export type Address = { id: number; label: string; details: string; isDefault: boolean };
export type Payment = { id: number; label: string; details: string; isDefault: boolean };
export type TeamMember = { id: number; name: string; role: string };
export type Location = { id: number; label: string; details: string; isDefault: boolean };
export type FarmDocument = { id: number; name: string; details: string; status: 'Verified' | 'Pending' };
export type CartItem = { id: number; name: string; unit: string; price: number; quantity: number };
export type VendorProduct = { id:number; name:string; category:string; price:string; unit:string; stock:string; description:string };

type AppStore = {
  addresses: Address[]; addAddress: (label: string, details: string) => void; removeAddress: (id: number) => void; setDefaultAddress: (id: number) => void;
  payments: Payment[]; addPayment: (label: string, details: string) => void; removePayment: (id: number) => void; setDefaultPayment: (id: number) => void;
  team: TeamMember[]; addTeamMember: (name: string, role: string) => void; removeTeamMember: (id: number) => void;
  locations: Location[]; addLocation: (label: string, details: string) => void; removeLocation: (id: number) => void; setDefaultLocation: (id: number) => void;
  documents: FarmDocument[]; addDocument: (name: string) => void; removeDocument: (id: number) => void;
  payoutAccount: string; setPayoutAccount: (value: string) => void;
  cart: CartItem[]; addCartItem: (name: string, unit: string, price: number, quantity: number) => void; updateCartQuantity: (id: number, quantity: number) => void; removeCartItem: (id: number) => void; cartNote: string; setCartNote: (value: string) => void;
  deliveryWindow: string; setDeliveryWindow: (value: string) => void; placeOrder: () => void; lastOrderItems: CartItem[];
  marketDistance: string; marketMethods: string[]; setMarketFilters: (distance:string, methods:string[])=>void;
  vendorOrderStatus: string; setVendorOrderStatus: (value:string)=>void; vendorOrderDeclined: boolean; declineVendorOrder: ()=>void; appealResponse: string; submitAppealResponse: (value:string)=>void;
  vendorProducts: VendorProduct[]; saveVendorProduct: (product:Omit<VendorProduct,'id'>, id?:number)=>void; removeVendorProduct:(id:number)=>void;
  savedProducts: string[]; toggleSavedProduct: (name:string)=>void;
  buyerProfile:{name:string;phone:string;email:string}; updateBuyerProfile:(profile:{name:string;phone:string;email:string})=>void; farmProfile:{farm:string;owner:string;bio:string}; updateFarmProfile:(profile:{farm:string;owner:string;bio:string})=>void;
  notificationSettings:boolean[]; toggleNotification:(index:number)=>void;
};

const StoreContext = createContext<AppStore | null>(null);
export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>([{id:1,label:'Home',details:'12 Al-Nasr Street, Dokki, Giza',isDefault:true},{id:2,label:'Office',details:'Smart Village, Building B5, Giza',isDefault:false}]);
  const [payments, setPayments] = useState<Payment[]>([{id:1,label:'Cash on delivery',details:'Pay when your order arrives',isDefault:true},{id:2,label:'Visa ending in 4242',details:'Expires 08/29',isDefault:false}]);
  const [team, setTeam] = useState<TeamMember[]>([{id:1,name:'Ahmed Refaat',role:'Owner · Full access'},{id:2,name:'Mona Ali',role:'Order manager'},{id:3,name:'Youssef Adel',role:'Inventory manager'}]);
  const [locations, setLocations] = useState<Location[]>([{id:1,label:'Main farm gate',details:'Kafr Hakim Road, Giza',isDefault:true},{id:2,label:'Dokki collection point',details:'12 Al-Nasr Street, Giza',isDefault:false}]);
  const [documents, setDocuments] = useState<FarmDocument[]>([{id:1,name:'National ID',details:'Reviewed 12 May 2026',status:'Verified'},{id:2,name:'Farm registration',details:'Renews 4 February 2027',status:'Verified'},{id:3,name:'Organic certificate',details:'Review in progress',status:'Pending'}]);
  const [payoutAccount, setPayoutAccount] = useState('Bank account ending in 1842');
  const [cart, setCart] = useState<CartItem[]>([{id:1,name:'Baladi Tomatoes',unit:'kg',price:18,quantity:2},{id:2,name:'Cucumbers',unit:'kg',price:18,quantity:3},{id:3,name:'Fresh Mint',unit:'bunch',price:12,quantity:2}]);
  const [cartNote, setCartNote] = useState('');
  const [deliveryWindow, setDeliveryWindow] = useState('Today, 4–6 PM');
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
  const [marketDistance,setMarketDistance]=useState('Any distance');
  const [marketMethods,setMarketMethods]=useState<string[]>([]);
  const [vendorOrderStatus,setVendorOrderStatus]=useState('New');
  const [vendorOrderDeclined,setVendorOrderDeclined]=useState(false);
  const [appealResponse,setAppealResponse]=useState('');
  const [vendorProducts,setVendorProducts]=useState<VendorProduct[]>([{id:1,name:'Baladi Tomatoes',category:'Vegetables',price:'18',unit:'per kg',stock:'120 kg',description:'Firm, sun-ripened tomatoes.'},{id:2,name:'Sweet Oranges',category:'Fruit',price:'26',unit:'per kg',stock:'8 kg',description:'Sweet seasonal oranges.'},{id:3,name:'Fresh Mint',category:'Herbs',price:'12',unit:'per bunch',stock:'64 bunches',description:'Fresh organic mint.'},{id:4,name:'Medjool Dates',category:'Pantry',price:'145',unit:'per kg',stock:'42 kg',description:'Premium grade dates.'}]);
  const [savedProducts,setSavedProducts]=useState<string[]>(['Sweet Oranges','Fresh Mint']);
  const [buyerProfile,setBuyerProfile]=useState({name:'Mariam Hassan',phone:'010 1234 5678',email:'mariam@example.com'});
  const [farmProfile,setFarmProfile]=useState({farm:'Nile Valley Farms',owner:'Ahmed Refaat',bio:'Fresh vegetables grown responsibly in Giza.'});
  const [notificationSettings,setNotificationSettings]=useState([true,true,true,false]);
  const value = useMemo<AppStore>(() => ({
    addresses, addAddress:(label,details)=>setAddresses((current)=>[...current,{id:Date.now(),label,details,isDefault:current.length===0}]), removeAddress:(id)=>setAddresses((current)=>current.filter((item)=>item.id!==id)), setDefaultAddress:(id)=>setAddresses((current)=>current.map((item)=>({...item,isDefault:item.id===id}))),
    payments, addPayment:(label,details)=>setPayments((current)=>[...current,{id:Date.now(),label,details,isDefault:current.length===0}]), removePayment:(id)=>setPayments((current)=>current.filter((item)=>item.id!==id)), setDefaultPayment:(id)=>setPayments((current)=>current.map((item)=>({...item,isDefault:item.id===id}))),
    team, addTeamMember:(name,role)=>setTeam((current)=>[...current,{id:Date.now(),name,role}]), removeTeamMember:(id)=>setTeam((current)=>current.filter((item)=>item.id!==id)),
    locations, addLocation:(label,details)=>setLocations((current)=>[...current,{id:Date.now(),label,details,isDefault:current.length===0}]), removeLocation:(id)=>setLocations((current)=>current.filter((item)=>item.id!==id)), setDefaultLocation:(id)=>setLocations((current)=>current.map((item)=>({...item,isDefault:item.id===id}))),
    documents, addDocument:(name)=>setDocuments((current)=>[...current,{id:Date.now(),name,details:'Submitted today',status:'Pending'}]), removeDocument:(id)=>setDocuments((current)=>current.filter((item)=>item.id!==id)),
    payoutAccount,setPayoutAccount,
    cart, addCartItem:(name,unit,price,quantity)=>setCart((current)=>{const existing=current.find((item)=>item.name===name);return existing?current.map((item)=>item.id===existing.id?{...item,quantity:item.quantity+quantity}:item):[...current,{id:Date.now(),name,unit,price,quantity}]}), updateCartQuantity:(id,quantity)=>setCart((current)=>quantity<1?current.filter((item)=>item.id!==id):current.map((item)=>item.id===id?{...item,quantity}:item)), removeCartItem:(id)=>setCart((current)=>current.filter((item)=>item.id!==id)), cartNote,setCartNote,
    deliveryWindow,setDeliveryWindow,placeOrder:()=>{setLastOrderItems(cart);setCart([]);setCartNote('');},lastOrderItems,
    marketDistance,marketMethods,setMarketFilters:(distance,methods)=>{setMarketDistance(distance);setMarketMethods(methods)},
    vendorOrderStatus,setVendorOrderStatus,vendorOrderDeclined,declineVendorOrder:()=>setVendorOrderDeclined(true),appealResponse,submitAppealResponse:setAppealResponse,
    vendorProducts,saveVendorProduct:(product,id)=>setVendorProducts(current=>id?current.map(item=>item.id===id?{...product,id}:item):[...current,{...product,id:Date.now()}]),removeVendorProduct:(id)=>setVendorProducts(current=>current.filter(item=>item.id!==id)),
    savedProducts,toggleSavedProduct:(name)=>setSavedProducts(current=>current.includes(name)?current.filter(item=>item!==name):[...current,name]),
    buyerProfile,updateBuyerProfile:setBuyerProfile,farmProfile,updateFarmProfile:setFarmProfile,
    notificationSettings,toggleNotification:(index)=>setNotificationSettings(current=>current.map((value,itemIndex)=>itemIndex===index?!value:value)),
  }), [addresses,payments,team,locations,documents,payoutAccount,cart,cartNote,deliveryWindow,lastOrderItems,marketDistance,marketMethods,vendorOrderStatus,vendorOrderDeclined,appealResponse,vendorProducts,savedProducts,buyerProfile,farmProfile,notificationSettings]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useAppStore(){const value=useContext(StoreContext); if(!value) throw new Error('AppStoreProvider missing'); return value;}
