export interface VehicleSeedItem {
  id: number;
  brand: string;
  vehicleModel: string;
  categorySlug: 'xe-tay-ga' | 'xe-50cc' | 'xe-so' | 'xe-con-tay' | 'xe-dien' | 'xe-phan-khoi-lon';
  color: string;
  engine: string;
  dailyPrice: number;
  hourlyPrice: number;
  transmissionType: 'Automatic' | 'Manual' | 'Semi-Auto';
  fuelType: 'Gasoline' | 'Electric';
  targetAudience: string;
  targetImageNames: {
    front: string;
    side: string;
    back: string;
  };
  images: [string, string, string]; // [Front, Side, Back] - 100% Cloudinary CDN f_auto,q_auto
}

export const VEHICLE_CATALOG_34: VehicleSeedItem[] = [
  {
    "id": 1,
    "brand": "Honda",
    "vehicleModel": "Honda Vision Smartkey",
    "categorySlug": "xe-tay-ga",
    "color": "Trắng Ngọc Trai",
    "engine": "110cc",
    "dailyPrice": 90000,
    "hourlyPrice": 18000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Nữ giới, cặp đôi dạo phố nhẹ nhàng",
    "targetImageNames": {
      "front": "Honda_Vision_Smartkey_Front.png",
      "side": "Honda_Vision_Smartkey_Side.png",
      "back": "Honda_Vision_Smartkey_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643917/bikes/1_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643840/bikes/1_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643840/bikes/1_4.jpg.png"
    ]
  },
  {
    "id": 2,
    "brand": "Honda",
    "vehicleModel": "Honda Air Blade",
    "categorySlug": "xe-tay-ga",
    "color": "Đen Nhám",
    "engine": "160cc",
    "dailyPrice": 130000,
    "hourlyPrice": 25000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Nam giới, gia đình, phượt đường dài",
    "targetImageNames": {
      "front": "Honda_Air_Blade_Front.png",
      "side": "Honda_Air_Blade_Side.png",
      "back": "Honda_Air_Blade_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643840/bikes/2_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643841/bikes/2_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643841/bikes/2_4.jpg.png"
    ]
  },
  {
    "id": 3,
    "brand": "Honda",
    "vehicleModel": "Honda Lead",
    "categorySlug": "xe-tay-ga",
    "color": "Nâu Vàng Ngọc Trai",
    "engine": "125cc",
    "dailyPrice": 120000,
    "hourlyPrice": 22000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Gia đình mang nhiều đồ dùng, bỉm sữa",
    "targetImageNames": {
      "front": "Honda_Lead_Front.png",
      "side": "Honda_Lead_Side.png",
      "back": "Honda_Lead_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643843/bikes/3_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643842/bikes/3_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643843/bikes/3_4.jpg.png"
    ]
  },
  {
    "id": 4,
    "brand": "Honda",
    "vehicleModel": "Honda SH Mode / SH",
    "categorySlug": "xe-tay-ga",
    "color": "Bạc Mờ",
    "engine": "150cc",
    "dailyPrice": 240000,
    "hourlyPrice": 40000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Khách hàng thích sự sang trọng, cao cấp",
    "targetImageNames": {
      "front": "Honda_SH_Mode_SH_Front.png",
      "side": "Honda_SH_Mode_SH_Side.png",
      "back": "Honda_SH_Mode_SH_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643844/bikes/4_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643845/bikes/4_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643846/bikes/4_4.jpg.png"
    ]
  },
  {
    "id": 5,
    "brand": "Yamaha",
    "vehicleModel": "Yamaha Grande Hybrid",
    "categorySlug": "xe-tay-ga",
    "color": "Trắng Sữa",
    "engine": "125cc",
    "dailyPrice": 120000,
    "hourlyPrice": 22000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Nữ giới chuộng xe ga thời trang, nhẹ nhàng",
    "targetImageNames": {
      "front": "Yamaha_Grande_Hybrid_Front.png",
      "side": "Yamaha_Grande_Hybrid_Side.png",
      "back": "Yamaha_Grande_Hybrid_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643846/bikes/5_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643847/bikes/5_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643848/bikes/5_4.jpg.png"
    ]
  },
  {
    "id": 6,
    "brand": "Yamaha",
    "vehicleModel": "Yamaha Janus",
    "categorySlug": "xe-tay-ga",
    "color": "Xanh Hồng Pastel",
    "engine": "125cc",
    "dailyPrice": 90000,
    "hourlyPrice": 18000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Học sinh, sinh viên, khách đi tiết kiệm",
    "targetImageNames": {
      "front": "Yamaha_Janus_Front.png",
      "side": "Yamaha_Janus_Side.png",
      "back": "Yamaha_Janus_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643849/bikes/6_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643850/bikes/6_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643851/bikes/6_4.jpg.png"
    ]
  },
  {
    "id": 7,
    "brand": "Yamaha",
    "vehicleModel": "Yamaha NVX",
    "categorySlug": "xe-tay-ga",
    "color": "Xanh Xám Thể Thao",
    "engine": "155cc",
    "dailyPrice": 140000,
    "hourlyPrice": 26000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Khách nam thích xe ga thể thao dũng mãnh",
    "targetImageNames": {
      "front": "Yamaha_NVX_Front.png",
      "side": "Yamaha_NVX_Side.png",
      "back": "Yamaha_NVX_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643852/bikes/7_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643851/bikes/7_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643852/bikes/7_4.jpg.png"
    ]
  },
  {
    "id": 8,
    "brand": "Vespa",
    "vehicleModel": "Vespa Sprint / Primavera",
    "categorySlug": "xe-tay-ga",
    "color": "Vàng Vespa",
    "engine": "125cc",
    "dailyPrice": 220000,
    "hourlyPrice": 38000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Khách du lịch chụp ảnh check-in sang chảnh",
    "targetImageNames": {
      "front": "Vespa_Sprint_Primavera_Front.png",
      "side": "Vespa_Sprint_Primavera_Side.png",
      "back": "Vespa_Sprint_Primavera_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643852/bikes/8_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643854/bikes/8_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643857/bikes/8_4.jpg.png"
    ]
  },
  {
    "id": 9,
    "brand": "Piaggio",
    "vehicleModel": "Piaggio Liberty ABS",
    "categorySlug": "xe-tay-ga",
    "color": "Trắng Bóng",
    "engine": "125cc",
    "dailyPrice": 140000,
    "hourlyPrice": 26000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Khách hàng thích phong cách Ý thời thượng",
    "targetImageNames": {
      "front": "Piaggio_Liberty_ABS_Front.png",
      "side": "Piaggio_Liberty_ABS_Side.png",
      "back": "Piaggio_Liberty_ABS_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643855/bikes/9_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643856/bikes/9_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643856/bikes/9_4.jpg.png"
    ]
  },
  {
    "id": 10,
    "brand": "Suzuki",
    "vehicleModel": "Suzuki Burgman Street",
    "categorySlug": "xe-tay-ga",
    "color": "Đồng Mờ",
    "engine": "125cc",
    "dailyPrice": 130000,
    "hourlyPrice": 24000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Khách thích ngồi thoải mái, đi tour êm",
    "targetImageNames": {
      "front": "Suzuki_Burgman_Street_Front.png",
      "side": "Suzuki_Burgman_Street_Side.png",
      "back": "Suzuki_Burgman_Street_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643856/bikes/10_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643860/bikes/10_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643860/bikes/10_4.jpg.png"
    ]
  },
  {
    "id": 11,
    "brand": "Suzuki",
    "vehicleModel": "Suzuki Impulse",
    "categorySlug": "xe-tay-ga",
    "color": "Đỏ Đen Thể Thao",
    "engine": "125cc",
    "dailyPrice": 100000,
    "hourlyPrice": 20000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Khách nam thích xe thể thao, đầm máy",
    "targetImageNames": {
      "front": "Suzuki_Impulse_Front.png",
      "side": "Suzuki_Impulse_Side.png",
      "back": "Suzuki_Impulse_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643859/bikes/11_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643862/bikes/11_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643860/bikes/11_4.jpg.png"
    ]
  },
  {
    "id": 12,
    "brand": "SYM",
    "vehicleModel": "SYM Attila (Elizabeth/Venus)",
    "categorySlug": "xe-tay-ga",
    "color": "Trắng Tròn",
    "engine": "125cc",
    "dailyPrice": 90000,
    "hourlyPrice": 18000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Phái nữ thích xe ga thanh lịch giá mềm",
    "targetImageNames": {
      "front": "SYM_Attila_(Elizabeth_Venus)_Front.png",
      "side": "SYM_Attila_(Elizabeth_Venus)_Side.png",
      "back": "SYM_Attila_(Elizabeth_Venus)_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643867/bikes/12_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643864/bikes/12_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643864/bikes/12_4.jpg.png"
    ]
  },
  {
    "id": 13,
    "brand": "SYM",
    "vehicleModel": "SYM Elite 50",
    "categorySlug": "xe-50cc",
    "color": "Hồng Trắng Retro",
    "engine": "50cc",
    "dailyPrice": 110000,
    "hourlyPrice": 22000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Dáng tròn hoài cổ nhỏ xinh, không cần bằng lái",
    "targetImageNames": {
      "front": "SYM_Elite_50_Front.png",
      "side": "SYM_Elite_50_Side.png",
      "back": "SYM_Elite_50_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643864/bikes/13_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643864/bikes/13_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643867/bikes/13_4.jpg.png"
    ]
  },
  {
    "id": 14,
    "brand": "SYM",
    "vehicleModel": "SYM Passing 50",
    "categorySlug": "xe-50cc",
    "color": "Đen Vàng Thể Thao",
    "engine": "50cc",
    "dailyPrice": 110000,
    "hourlyPrice": 22000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Kiểu dáng thể thao cho nam, không cần bằng lái",
    "targetImageNames": {
      "front": "SYM_Passing_50_Front.png",
      "side": "SYM_Passing_50_Side.png",
      "back": "SYM_Passing_50_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643868/bikes/14_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643869/bikes/14_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643869/bikes/14_4.jpg.png"
    ]
  },
  {
    "id": 15,
    "brand": "SYM",
    "vehicleModel": "SYM Attila 50",
    "categorySlug": "xe-50cc",
    "color": "Đỏ Vespa",
    "engine": "50cc",
    "dailyPrice": 120000,
    "hourlyPrice": 24000,
    "transmissionType": "Automatic",
    "fuelType": "Gasoline",
    "targetAudience": "Dáng Vespa sang trọng, không cần bằng lái",
    "targetImageNames": {
      "front": "SYM_Attila_50_Front.png",
      "side": "SYM_Attila_50_Side.png",
      "back": "SYM_Attila_50_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643877/bikes/15_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643871/bikes/15_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643872/bikes/15_4.jpg.png"
    ]
  },
  {
    "id": 16,
    "brand": "SYM",
    "vehicleModel": "SYM Elegant 50",
    "categorySlug": "xe-50cc",
    "color": "Xanh Đen Phổ Thông",
    "engine": "50cc",
    "dailyPrice": 85000,
    "hourlyPrice": 18000,
    "transmissionType": "Semi-Auto",
    "fuelType": "Gasoline",
    "targetAudience": "Xe số cực bền, tiết kiệm xăng, không cần bằng lái",
    "targetImageNames": {
      "front": "SYM_Elegant_50_Front.png",
      "side": "SYM_Elegant_50_Side.png",
      "back": "SYM_Elegant_50_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643872/bikes/16_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643873/bikes/16_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643874/bikes/16_4.jpg.png"
    ]
  },
  {
    "id": 17,
    "brand": "SYM",
    "vehicleModel": "SYM Angela 50",
    "categorySlug": "xe-50cc",
    "color": "Xanh Mint Sữa",
    "engine": "50cc",
    "dailyPrice": 90000,
    "hourlyPrice": 18000,
    "transmissionType": "Semi-Auto",
    "fuelType": "Gasoline",
    "targetAudience": "Xe số nhẹ nhàng kèm hộc đồ trước, không bằng lái",
    "targetImageNames": {
      "front": "SYM_Angela_50_Front.png",
      "side": "SYM_Angela_50_Side.png",
      "back": "SYM_Angela_50_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643875/bikes/17_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643876/bikes/17_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643876/bikes/17_4.jpg.png"
    ]
  },
  {
    "id": 18,
    "brand": "Honda",
    "vehicleModel": "Honda Wave Alpha / RSX",
    "categorySlug": "xe-so",
    "color": "Đỏ Đô",
    "engine": "110cc",
    "dailyPrice": 80000,
    "hourlyPrice": 16000,
    "transmissionType": "Semi-Auto",
    "fuelType": "Gasoline",
    "targetAudience": "Khách đi bụi, cần xe siêu bền, siêu rẻ",
    "targetImageNames": {
      "front": "Honda_Wave_Alpha_RSX_Front.png",
      "side": "Honda_Wave_Alpha_RSX_Side.png",
      "back": "Honda_Wave_Alpha_RSX_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643877/bikes/18_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643880/bikes/18_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643879/bikes/18_4.jpg.png"
    ]
  },
  {
    "id": 19,
    "brand": "Honda",
    "vehicleModel": "Honda Future",
    "categorySlug": "xe-so",
    "color": "Xanh Tím Than",
    "engine": "125cc",
    "dailyPrice": 110000,
    "hourlyPrice": 22000,
    "transmissionType": "Semi-Auto",
    "fuelType": "Gasoline",
    "targetAudience": "Người trung niên, khách đi tour đường dài",
    "targetImageNames": {
      "front": "Honda_Future_Front.png",
      "side": "Honda_Future_Side.png",
      "back": "Honda_Future_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643880/bikes/19_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643881/bikes/19_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643882/bikes/19_4.jpg.png"
    ]
  },
  {
    "id": 20,
    "brand": "Yamaha",
    "vehicleModel": "Yamaha Sirius",
    "categorySlug": "xe-so",
    "color": "Đen Đỏ Sport",
    "engine": "110cc",
    "dailyPrice": 80000,
    "hourlyPrice": 16000,
    "transmissionType": "Semi-Auto",
    "fuelType": "Gasoline",
    "targetAudience": "Các bạn trẻ phượt đèo dốc khoẻ",
    "targetImageNames": {
      "front": "Yamaha_Sirius_Front.png",
      "side": "Yamaha_Sirius_Side.png",
      "back": "Yamaha_Sirius_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643881/bikes/20_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643884/bikes/20_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643884/bikes/20_4.jpg.png"
    ]
  },
  {
    "id": 21,
    "brand": "Yamaha",
    "vehicleModel": "Yamaha Jupiter FI",
    "categorySlug": "xe-so",
    "color": "Vàng Kim Loại",
    "engine": "115cc",
    "dailyPrice": 100000,
    "hourlyPrice": 20000,
    "transmissionType": "Semi-Auto",
    "fuelType": "Gasoline",
    "targetAudience": "Khách thích xe số đầm chắc, tăng tốc bốc",
    "targetImageNames": {
      "front": "Yamaha_Jupiter_FI_Front.png",
      "side": "Yamaha_Jupiter_FI_Side.png",
      "back": "Yamaha_Jupiter_FI_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643885/bikes/21_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643885/bikes/21_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643885/bikes/21_4.jpg.png"
    ]
  },
  {
    "id": 22,
    "brand": "Yamaha",
    "vehicleModel": "Yamaha Exciter 150/155 VVA",
    "categorySlug": "xe-con-tay",
    "color": "Xanh GP Racing",
    "engine": "155cc",
    "dailyPrice": 120000,
    "hourlyPrice": 24000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Giới trẻ đam mê xe côn tay phổ thông",
    "targetImageNames": {
      "front": "Yamaha_Exciter_150_155_VVA_Front.png",
      "side": "Yamaha_Exciter_150_155_VVA_Side.png",
      "back": "Yamaha_Exciter_150_155_VVA_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643886/bikes/22_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643888/bikes/22_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643888/bikes/22_4.jpg.png"
    ]
  },
  {
    "id": 23,
    "brand": "Honda",
    "vehicleModel": "Honda Winner X",
    "categorySlug": "xe-con-tay",
    "color": "Đỏ Bạc Thể Thao",
    "engine": "150cc",
    "dailyPrice": 110000,
    "hourlyPrice": 22000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Khách thích xe đầm chắc có phanh ABS",
    "targetImageNames": {
      "front": "Honda_Winner_X_Front.png",
      "side": "Honda_Winner_X_Side.png",
      "back": "Honda_Winner_X_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643889/bikes/23_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643890/bikes/23_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643890/bikes/23_4.jpg.png"
    ]
  },
  {
    "id": 24,
    "brand": "Suzuki",
    "vehicleModel": "Suzuki Raider / Satria 150",
    "categorySlug": "xe-con-tay",
    "color": "Xanh Bạc Đua",
    "engine": "150cc",
    "dailyPrice": 140000,
    "hourlyPrice": 26000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Khách đam mê máy bốc, kiểu dáng hyper",
    "targetImageNames": {
      "front": "Suzuki_Raider_Satria_150_Front.png",
      "side": "Suzuki_Raider_Satria_150_Side.png",
      "back": "Suzuki_Raider_Satria_150_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643893/bikes/24_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643893/bikes/24_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643893/bikes/24_4.jpg.png"
    ]
  },
  {
    "id": 25,
    "brand": "Yamaha",
    "vehicleModel": "Yamaha XSR 155",
    "categorySlug": "xe-con-tay",
    "color": "Bạc Cổ Điển",
    "engine": "155cc",
    "dailyPrice": 200000,
    "hourlyPrice": 35000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Khách phượt thích phong cách hoài cổ",
    "targetImageNames": {
      "front": "Yamaha_XSR_155_Front.png",
      "side": "Yamaha_XSR_155_Side.png",
      "back": "Yamaha_XSR_155_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643894/bikes/25_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643894/bikes/25_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643894/bikes/25_4.jpg.png"
    ]
  },
  {
    "id": 26,
    "brand": "Honda",
    "vehicleModel": "Honda CB150R Neo",
    "categorySlug": "xe-con-tay",
    "color": "Xám Mờ",
    "engine": "150cc",
    "dailyPrice": 200000,
    "hourlyPrice": 35000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Khách thích xe naked hiện đại pha cổ điển",
    "targetImageNames": {
      "front": "Honda_CB150R_Neo_Front.png",
      "side": "Honda_CB150R_Neo_Side.png",
      "back": "Honda_CB150R_Neo_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643897/bikes/26_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643898/bikes/26_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643897/bikes/26_4.jpg.png"
    ]
  },
  {
    "id": 27,
    "brand": "Suzuki",
    "vehicleModel": "Suzuki Bandit 150 / GSX-S150",
    "categorySlug": "xe-con-tay",
    "color": "Đen Bóng",
    "engine": "150cc",
    "dailyPrice": 150000,
    "hourlyPrice": 28000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Khách phượt đường dài cần tư thế ngồi êm",
    "targetImageNames": {
      "front": "Suzuki_Bandit_150_GSX-S150_Front.png",
      "side": "Suzuki_Bandit_150_GSX-S150_Side.png",
      "back": "Suzuki_Bandit_150_GSX-S150_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643899/bikes/27_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643901/bikes/27_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643898/bikes/27_4.jpg.png"
    ]
  },
  {
    "id": 28,
    "brand": "VinFast",
    "vehicleModel": "VinFast Evo200",
    "categorySlug": "xe-dien",
    "color": "Cam Bóng",
    "engine": "~200 km",
    "dailyPrice": 100000,
    "hourlyPrice": 20000,
    "transmissionType": "Automatic",
    "fuelType": "Electric",
    "targetAudience": "Xe điện nhỏ gọn dạo phố xanh mát",
    "targetImageNames": {
      "front": "VinFast_Evo200_Front.png",
      "side": "VinFast_Evo200_Side.png",
      "back": "VinFast_Evo200_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643900/bikes/28_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643903/bikes/28_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643902/bikes/28_4.jpg.png"
    ]
  },
  {
    "id": 29,
    "brand": "VinFast",
    "vehicleModel": "VinFast Feliz S",
    "categorySlug": "xe-dien",
    "color": "Trắng Ngọc Trai",
    "engine": "~198 km",
    "dailyPrice": 120000,
    "hourlyPrice": 24000,
    "transmissionType": "Automatic",
    "fuelType": "Electric",
    "targetAudience": "Đầm chắc, cốp rộng, động cơ khoẻ",
    "targetImageNames": {
      "front": "VinFast_Feliz_S_Front.png",
      "side": "VinFast_Feliz_S_Side.png",
      "back": "VinFast_Feliz_S_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643903/bikes/29_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643904/bikes/29_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643905/bikes/29_4.jpg.png"
    ]
  },
  {
    "id": 30,
    "brand": "VinFast",
    "vehicleModel": "VinFast Klara S",
    "categorySlug": "xe-dien",
    "color": "Xanh Tím Than",
    "engine": "~194 km",
    "dailyPrice": 130000,
    "hourlyPrice": 25000,
    "transmissionType": "Automatic",
    "fuelType": "Electric",
    "targetAudience": "Kiểu dáng Vespa thanh lịch, chống nước ngập",
    "targetImageNames": {
      "front": "VinFast_Klara_S_Front.png",
      "side": "VinFast_Klara_S_Side.png",
      "back": "VinFast_Klara_S_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643908/bikes/30_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643906/bikes/30_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643906/bikes/30_4.jpg.png"
    ]
  },
  {
    "id": 31,
    "brand": "Dat Bike",
    "vehicleModel": "Dat Bike Weaver++",
    "categorySlug": "xe-dien",
    "color": "Cam Vintage",
    "engine": "~200 km",
    "dailyPrice": 160000,
    "hourlyPrice": 30000,
    "transmissionType": "Automatic",
    "fuelType": "Electric",
    "targetAudience": "Kiểu dáng retro phá cách, máy siêu bốc",
    "targetImageNames": {
      "front": "Dat_Bike_Weaver_Plus_Plus_Front.png",
      "side": "Dat_Bike_Weaver_Plus_Plus_Side.png",
      "back": "Dat_Bike_Weaver_Plus_Plus_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643908/bikes/31_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643909/bikes/31_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643909/bikes/31_4.jpg.png"
    ]
  },
  {
    "id": 32,
    "brand": "Honda",
    "vehicleModel": "Honda Rebel 300 / 500",
    "categorySlug": "xe-phan-khoi-lon",
    "color": "Xám Cát Mờ",
    "engine": "300cc/500cc",
    "dailyPrice": 450000,
    "hourlyPrice": 80000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Cruiser phong trần, hợp phượt đường dài",
    "targetImageNames": {
      "front": "Honda_Rebel_300_500_Front.png",
      "side": "Honda_Rebel_300_500_Side.png",
      "back": "Honda_Rebel_300_500_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643910/bikes/32_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643911/bikes/32_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643912/bikes/32_4.jpg.png"
    ]
  },
  {
    "id": 33,
    "brand": "Honda",
    "vehicleModel": "Honda CB500X",
    "categorySlug": "xe-phan-khoi-lon",
    "color": "Đỏ Đen Adventure",
    "engine": "500cc",
    "dailyPrice": 550000,
    "hourlyPrice": 95000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Adventure đường trường leo núi đèo",
    "targetImageNames": {
      "front": "Honda_CB500X_Front.png",
      "side": "Honda_CB500X_Side.png",
      "back": "Honda_CB500X_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643914/bikes/33_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643914/bikes/33_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643913/bikes/33_4.jpg.png"
    ]
  },
  {
    "id": 34,
    "brand": "Kawasaki",
    "vehicleModel": "Kawasaki Ninja 400",
    "categorySlug": "xe-phan-khoi-lon",
    "color": "Xanh Lá Thể Thao",
    "engine": "400cc",
    "dailyPrice": 450000,
    "hourlyPrice": 80000,
    "transmissionType": "Manual",
    "fuelType": "Gasoline",
    "targetAudience": "Sport-bike thể thao tốc độ cao",
    "targetImageNames": {
      "front": "Kawasaki_Ninja_400_Front.png",
      "side": "Kawasaki_Ninja_400_Side.png",
      "back": "Kawasaki_Ninja_400_Back.png"
    },
    "images": [
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643915/bikes/34_1.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643916/bikes/34_3.jpg.png",
      "https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643916/bikes/34_4.jpg.png"
    ]
  }
];
