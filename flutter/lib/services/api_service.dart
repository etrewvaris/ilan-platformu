// lib/services/api_service.dart
// Backend API'siyle iletişimi yöneten servis katmanı.
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/listing.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ApiService {
  // Gerçek ortamda bu değeri --dart-define=API_BASE_URL=... ile
  // veya bir konfigürasyon dosyasından okuyacak şekilde ayarlayın.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api', // Android emülatöründe localhost karşılığı
  );

  final http.Client _client;

  ApiService({http.Client? client}) : _client = client ?? http.Client();

  /// Tek bir ilanın tüm detaylarını getirir (dinamik attributes dahil).
  Future<Listing> fetchListingDetail(String listingId) async {
    final uri = Uri.parse('$baseUrl/listings/$listingId');

    try {
      final response = await _client.get(uri).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
        if (body['success'] == true) {
          return Listing.fromJson(body['data'] as Map<String, dynamic>);
        }
        throw ApiException(body['message']?.toString() ?? 'Bilinmeyen hata');
      } else if (response.statusCode == 404) {
        throw ApiException('İlan bulunamadı', statusCode: 404);
      } else {
        throw ApiException('Sunucu hatası (${response.statusCode})', statusCode: response.statusCode);
      }
    } on http.ClientException {
      throw ApiException('Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.');
    }
  }

  /// İlanları filtreye göre listeler (kategori id + JSONB özellik filtresi dahil).
  Future<Map<String, dynamic>> fetchListings({
    int? categoryId,
    String? city,
    double? minPrice,
    double? maxPrice,
    Map<String, dynamic>? attributes,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (categoryId != null) queryParams['category_id'] = categoryId.toString();
    if (city != null && city.isNotEmpty) queryParams['city'] = city;
    if (minPrice != null) queryParams['min_price'] = minPrice.toString();
    if (maxPrice != null) queryParams['max_price'] = maxPrice.toString();
    if (attributes != null && attributes.isNotEmpty) {
      queryParams['attributes'] = jsonEncode(attributes);
    }

    final uri = Uri.parse('$baseUrl/listings').replace(queryParameters: queryParams);
    final response = await _client.get(uri).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      final body = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
      return body;
    }
    throw ApiException('İlanlar getirilemedi (${response.statusCode})', statusCode: response.statusCode);
  }

  void dispose() => _client.close();
}
