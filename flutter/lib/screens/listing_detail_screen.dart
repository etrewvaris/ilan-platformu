// lib/screens/listing_detail_screen.dart
// Kategoriye göre değişen JSONB "attributes" alanını, kategorinin
// attribute_schema'sına bakarak DİNAMİK olarak render eden ilan detay ekranı.
import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../services/api_service.dart';

class ListingDetailScreen extends StatefulWidget {
  final String listingId;

  const ListingDetailScreen({super.key, required this.listingId});

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  final ApiService _apiService = ApiService();
  late Future<Listing> _listingFuture;

  @override
  void initState() {
    super.initState();
    _listingFuture = _apiService.fetchListingDetail(widget.listingId);
  }

  Future<void> _refresh() async {
    setState(() {
      _listingFuture = _apiService.fetchListingDetail(widget.listingId);
    });
    await _listingFuture;
  }

  @override
  void dispose() {
    _apiService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<Listing>(
        future: _listingFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            final message = snapshot.error is ApiException
                ? (snapshot.error as ApiException).message
                : 'Bir şeyler ters gitti';
            return _ErrorView(message: message, onRetry: _refresh);
          }

          final listing = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: CustomScrollView(
              slivers: [
                _ImageAppBar(listing: listing),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _PriceAndBadges(listing: listing),
                        const SizedBox(height: 8),
                        Text(
                          listing.title,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text(
                              '${listing.district}, ${listing.city}',
                              style: const TextStyle(color: Colors.grey),
                            ),
                            const Spacer(),
                            Text(
                              '${listing.viewCount} görüntülenme',
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                        const Divider(height: 32),

                        // --- Kategoriye özgü DİNAMİK özellikler ---
                        Text('İlan Özellikleri', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 12),
                        _DynamicAttributesGrid(listing: listing),

                        const Divider(height: 32),
                        Text('Açıklama', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        Text(listing.description, style: const TextStyle(height: 1.5)),

                        const Divider(height: 32),
                        _SellerCard(listing: listing),
                        const SizedBox(height: 80), // alt bar için boşluk
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: FutureBuilder<Listing>(
        future: _listingFuture,
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const SizedBox.shrink();
          return _ContactBar(listing: snapshot.data!);
        },
      ),
    );
  }
}

/// Görsel galerisi + AppBar (SliverAppBar ile birlikte kayan görsel alanı)
class _ImageAppBar extends StatefulWidget {
  final Listing listing;
  const _ImageAppBar({required this.listing});

  @override
  State<_ImageAppBar> createState() => _ImageAppBarState();
}

class _ImageAppBarState extends State<_ImageAppBar> {
  final PageController _controller = PageController();
  int _currentPage = 0;

  @override
  Widget build(BuildContext context) {
    final images = widget.listing.images;
    return SliverAppBar(
      pinned: true,
      expandedHeight: 280,
      flexibleSpace: FlexibleSpaceBar(
        background: images.isEmpty
            ? Container(
                color: Colors.grey[300],
                child: const Icon(Icons.image_not_supported_outlined, size: 48, color: Colors.grey),
              )
            : Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    controller: _controller,
                    itemCount: images.length,
                    onPageChanged: (i) => setState(() => _currentPage = i),
                    itemBuilder: (context, index) => Image.network(
                      images[index].url,
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, progress) =>
                          progress == null ? child : Container(color: Colors.grey[200]),
                      errorBuilder: (context, error, stack) => Container(
                        color: Colors.grey[300],
                        child: const Icon(Icons.broken_image_outlined, color: Colors.grey),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 12,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(images.length, (i) {
                        return Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: i == _currentPage ? Colors.white : Colors.white54,
                          ),
                        );
                      }),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _PriceAndBadges extends StatelessWidget {
  final Listing listing;
  const _PriceAndBadges({required this.listing});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          listing.formattedPrice,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.black87),
        ),
        const SizedBox(width: 8),
        if (listing.isUrgent) _Badge(text: 'ACİL', color: Colors.red),
        if (listing.isFeatured) _Badge(text: 'ÖNE ÇIKAN', color: Colors.amber[800]!),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  const _Badge({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
      child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}

/// Kategori attribute_schema'sını kullanarak "attributes" JSONB verisini
/// okunabilir etiket + değer çiftleri halinde ızgara olarak gösterir.
/// Şemada tanımlı olmayan ekstra anahtarlar da güvenlik amacıyla en altta
/// ham biçimde (anahtar adı) gösterilir.
class _DynamicAttributesGrid extends StatelessWidget {
  final Listing listing;
  const _DynamicAttributesGrid({required this.listing});

  String _formatValue(dynamic value, String type) {
    if (value == null) return '-';
    if (type == 'boolean') return value == true ? 'Evet' : 'Hayır';
    if (value is num) {
      // Basit binlik ayraç
      return value.toStringAsFixed(value is int || value == value.roundToDouble() ? 0 : 2).replaceAllMapped(
            RegExp(r'\B(?=(\d{3})+(?!\d))'),
            (m) => '.',
          );
    }
    return value.toString();
  }

  @override
  Widget build(BuildContext context) {
    final schema = listing.category.attributeSchema;
    final attrs = listing.attributes;

    // Şemada tanımlı sıraya göre (label, value) listesi oluştur
    final items = <MapEntry<String, String>>[];
    final handledKeys = <String>{};

    for (final field in schema) {
      final key = field['key'] as String;
      if (!attrs.containsKey(key)) continue;
      handledKeys.add(key);
      final label = field['label'] as String? ?? key;
      final type = field['type'] as String? ?? 'text';
      items.add(MapEntry(label, _formatValue(attrs[key], type)));
    }

    // Şemada olmayan ama attributes içinde bulunan ekstra alanlar
    attrs.forEach((key, value) {
      if (!handledKeys.contains(key)) {
        items.add(MapEntry(key, _formatValue(value, 'text')));
      }
    });

    if (items.isEmpty) {
      return const Text('Bu ilan için ek özellik girilmemiş.', style: TextStyle(color: Colors.grey));
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 3.2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemBuilder: (context, index) {
        final item = items[index];
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFFF5F5F5),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(item.key, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 2),
              Text(
                item.value,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SellerCard extends StatelessWidget {
  final Listing listing;
  const _SellerCard({required this.listing});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: Colors.blueGrey.shade100,
            child: Icon(
              listing.seller.isCorporate ? Icons.storefront_outlined : Icons.person_outline,
              color: Colors.blueGrey,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(listing.seller.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  listing.seller.isCorporate ? 'Kurumsal Satıcı' : 'Bireysel Satıcı',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactBar extends StatelessWidget {
  final Listing listing;
  const _ContactBar({required this.listing});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, -2))],
        ),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  // TODO: mesajlaşma ekranına yönlendirme
                },
                icon: const Icon(Icons.message_outlined),
                label: const Text('Mesaj Gönder'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: listing.seller.phone == null
                    ? null
                    : () {
                        // TODO: url_launcher ile tel: linki açılabilir
                        // launchUrl(Uri.parse('tel:${listing.seller.phone}'));
                      },
                icon: const Icon(Icons.phone_outlined),
                label: const Text('Ara'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(message, textAlign: TextAlign.center),
          ),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Tekrar Dene')),
        ],
      ),
    );
  }
}
