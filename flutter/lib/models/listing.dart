// lib/models/listing.dart
// Backend'den gelen ilan detayını temsil eden model.
// "attributes" alanı kategoriye göre değiştiği için Map<String, dynamic>
// olarak tutulur ve ekran tarafında dinamik olarak render edilir.

class ListingImage {
  final String id;
  final String url;
  final int sortOrder;
  final bool isCover;

  ListingImage({
    required this.id,
    required this.url,
    required this.sortOrder,
    required this.isCover,
  });

  factory ListingImage.fromJson(Map<String, dynamic> json) {
    return ListingImage(
      id: json['id'] as String,
      url: json['url'] as String,
      sortOrder: json['sort_order'] as int? ?? 0,
      isCover: json['is_cover'] as bool? ?? false,
    );
  }
}

class ListingCategory {
  final int id;
  final String name;
  final String slug;
  // Bu kategoriye ait alanların ekranda hangi sırada ve hangi etiketle
  // gösterileceğini belirleyen şema: [{"key":"room_count","label":"Oda Sayısı","type":"select"}, ...]
  final List<Map<String, dynamic>> attributeSchema;

  ListingCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.attributeSchema,
  });

  factory ListingCategory.fromJson(Map<String, dynamic> json) {
    return ListingCategory(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
      attributeSchema: (json['attribute_schema'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
    );
  }
}

class ListingSeller {
  final String name;
  final String? phone;
  final bool isCorporate;

  ListingSeller({required this.name, this.phone, required this.isCorporate});

  factory ListingSeller.fromJson(Map<String, dynamic> json) {
    return ListingSeller(
      name: json['name'] as String,
      phone: json['phone'] as String?,
      isCorporate: json['is_corporate'] as bool? ?? false,
    );
  }
}

class Listing {
  final String id;
  final String title;
  final String description;
  final double price;
  final String currency;
  final String city;
  final String district;
  final String? neighborhood;
  final Map<String, dynamic> attributes;
  final String status;
  final int viewCount;
  final bool isUrgent;
  final bool isFeatured;
  final DateTime createdAt;
  final ListingCategory category;
  final ListingSeller seller;
  final List<ListingImage> images;

  Listing({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    required this.currency,
    required this.city,
    required this.district,
    this.neighborhood,
    required this.attributes,
    required this.status,
    required this.viewCount,
    required this.isUrgent,
    required this.isFeatured,
    required this.createdAt,
    required this.category,
    required this.seller,
    required this.images,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    return Listing(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      price: (json['price'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'TRY',
      city: json['city'] as String,
      district: json['district'] as String,
      neighborhood: json['neighborhood'] as String?,
      attributes: Map<String, dynamic>.from(json['attributes'] as Map? ?? {}),
      status: json['status'] as String,
      viewCount: json['view_count'] as int? ?? 0,
      isUrgent: json['is_urgent'] as bool? ?? false,
      isFeatured: json['is_featured'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      category: ListingCategory.fromJson(json['category'] as Map<String, dynamic>),
      seller: ListingSeller.fromJson(json['seller'] as Map<String, dynamic>),
      images: (json['images'] as List<dynamic>? ?? [])
          .map((e) => ListingImage.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }

  String get formattedPrice {
    // Basit Türkçe para birimi biçimlendirmesi (binlik ayraç)
    final priceStr = price.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'\B(?=(\d{3})+(?!\d))'),
          (match) => '.',
        );
    final symbol = currency == 'TRY' ? '₺' : currency;
    return '$priceStr $symbol';
  }
}
