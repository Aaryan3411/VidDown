import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:dio/dio.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const VidDownApp());
}

class VidDownApp extends StatelessWidget {
  const VidDownApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VidDown Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          primary: const Color(0xFF2563EB),
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 1,
          iconTheme: IconThemeData(color: Color(0xFF0F172A)),
          titleTextStyle: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      home: const DownloaderHomeScreen(),
    );
  }
}

class DownloaderHomeScreen extends StatefulWidget {
  const DownloaderHomeScreen({super.key});

  @override
  State<DownloaderHomeScreen> createState() => _DownloaderHomeScreenState();
}

class _DownloaderHomeScreenState extends State<DownloaderHomeScreen> {
  final TextEditingController _urlController = TextEditingController();
  final YoutubeExplode _yt = YoutubeExplode();

  bool _isAnalyzing = false;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String _statusMessage = '';

  Video? _videoDetails;
  StreamManifest? _manifest;
  MuxedStreamInfo? _selectedMuxedStream;
  AudioOnlyStreamInfo? _selectedAudioStream;

  @override
  void dispose() {
    _urlController.dispose();
    _yt.close();
    super.dispose();
  }

  Future<void> _pasteFromClipboard() async {
    final clipboardData = await Clipboard.getData(Clipboard.kTextPlain);
    if (clipboardData != null && clipboardData.text != null) {
      setState(() {
        _urlController.text = clipboardData.text!.trim();
      });
      _analyzeUrl();
    }
  }

  Future<void> _analyzeUrl() async {
    final rawUrl = _urlController.text.trim();
    if (rawUrl.isEmpty) {
      _showSnackbar('Please enter or paste a valid link.');
      return;
    }

    setState(() {
      _isAnalyzing = true;
      _videoDetails = null;
      _manifest = null;
      _selectedMuxedStream = null;
      _selectedAudioStream = null;
      _statusMessage = 'Analyzing media stream...';
    });

    try {
      // Check if YouTube URL
      if (rawUrl.contains('youtube.com') || rawUrl.contains('youtu.be')) {
        final videoId = VideoId(rawUrl);
        final video = await _yt.videos.get(videoId);
        final manifest = await _yt.videos.streamsClient.getManifest(videoId);

        // Get muxed stream (contains both video and audio in a single track)
        MuxedStreamInfo? muxed = manifest.muxed.withHighestBitrate();

        // Get audio stream for MP3/Audio download option
        AudioOnlyStreamInfo? audio = manifest.audioOnly.withHighestBitrate();

        setState(() {
          _videoDetails = video;
          _manifest = manifest;
          _selectedMuxedStream = muxed;
          _selectedAudioStream = audio;
          _isAnalyzing = false;
        });
      } else {
        // Direct media URL (MP4, WEBM)
        _downloadDirectUrl(rawUrl);
      }
    } catch (e) {
      setState(() {
        _isAnalyzing = false;
        _statusMessage = '';
      });
      _showSnackbar('Failed to analyze stream: $e');
    }
  }

  Future<bool> _requestStoragePermissions() async {
    if (Platform.isAndroid) {
      if (await Permission.manageExternalStorage.isGranted) return true;
      if (await Permission.storage.isGranted) return true;

      final status = await Permission.storage.request();
      if (status.isGranted) return true;

      final manageStatus = await Permission.manageExternalStorage.request();
      return manageStatus.isGranted;
    }
    return true;
  }

  Future<Directory> _getDownloadDirectory() async {
    Directory? dir;
    if (Platform.isAndroid) {
      dir = Directory('/storage/emulated/0/Download');
      if (!await dir.exists()) {
        dir = await getExternalStorageDirectory();
      }
    } else {
      dir = await getApplicationDocumentsDirectory();
    }
    return dir ?? (await getApplicationDocumentsDirectory());
  }

  Future<void> _downloadYouTubeStream({required bool audioOnly}) async {
    if (_videoDetails == null || _manifest == null) return;

    final hasPermission = await _requestStoragePermissions();
    if (!hasPermission) {
      _showSnackbar('Storage permission is required to save downloads.');
      return;
    }

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _statusMessage = audioOnly ? 'Downloading audio...' : 'Downloading video...';
    });

    try {
      final saveDir = await _getDownloadDirectory();
      final cleanTitle = _videoDetails!.title
          .replaceAll(RegExp(r'[\\/:*?"<>|]'), '_')
          .trim();

      final ext = audioOnly ? 'mp3' : 'mp4';
      final file = File('${saveDir.path}/$cleanTitle.$ext');

      final streamInfo = audioOnly
          ? _selectedAudioStream ?? _manifest!.audioOnly.withHighestBitrate()
          : _selectedMuxedStream ?? _manifest!.muxed.withHighestBitrate();

      final totalBytes = streamInfo.size.totalBytes;
      int downloadedBytes = 0;

      final stream = _yt.videos.streamsClient.get(streamInfo);
      final output = file.openWrite();

      await for (final data in stream) {
        output.add(data);
        downloadedBytes += data.length;
        if (totalBytes > 0) {
          setState(() {
            _downloadProgress = downloadedBytes / totalBytes;
            _statusMessage =
                'Saving: ${(downloadedBytes / (1024 * 1024)).toStringAsFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
          });
        }
      }

      await output.flush();
      await output.close();

      setState(() {
        _isDownloading = false;
        _statusMessage = 'Done!';
      });

      _showSuccessDialog(file.path, cleanTitle);
    } catch (e) {
      setState(() {
        _isDownloading = false;
      });
      _showSnackbar('Download failed: $e');
    }
  }

  Future<void> _downloadDirectUrl(String url) async {
    final hasPermission = await _requestStoragePermissions();
    if (!hasPermission) {
      _showSnackbar('Storage permission required.');
      return;
    }

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _statusMessage = 'Downloading direct file...';
    });

    try {
      final saveDir = await _getDownloadDirectory();
      final uri = Uri.parse(url);
      String filename = uri.pathSegments.isNotEmpty
          ? uri.pathSegments.last
          : 'download_${DateTime.now().millisecondsSinceEpoch}.mp4';

      final file = File('${saveDir.path}/$filename');

      final dio = Dio();
      await dio.download(
        url,
        file.path,
        onReceiveProgress: (received, total) {
          if (total > 0) {
            setState(() {
              _downloadProgress = received / total;
              _statusMessage =
                  '${(received / (1024 * 1024)).toStringAsFixed(1)} MB / ${(total / (1024 * 1024)).toStringAsFixed(1)} MB';
            });
          }
        },
      );

      setState(() {
        _isDownloading = false;
        _statusMessage = 'Done!';
      });

      _showSuccessDialog(file.path, filename);
    } catch (e) {
      setState(() {
        _isDownloading = false;
      });
      _showSnackbar('Failed to download: $e');
    }
  }

  void _showSnackbar(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccessDialog(String filePath, String title) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Color(0xFF16A34A)),
            SizedBox(width: 8),
            Text('Saved to Device!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.bold),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            const Text(
              'Location on Phone:',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                filePath,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.download_for_offline, color: Color(0xFF2563EB)),
            SizedBox(width: 8),
            Text('VidDown Mobile'),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // URL Input Card
            Card(
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    TextField(
                      controller: _urlController,
                      decoration: InputDecoration(
                        hintText: 'Paste YouTube or Direct Video URL...',
                        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                        prefixIcon: const Icon(Icons.link, color: Color(0xFF64748B)),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.content_paste, color: Color(0xFF2563EB)),
                          tooltip: 'Paste from clipboard',
                          onPressed: _pasteFromClipboard,
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: _isAnalyzing || _isDownloading ? null : _analyzeUrl,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: _isAnalyzing
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.search, size: 18),
                                  SizedBox(width: 8),
                                  Text(
                                    'Fetch Media Streams',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Download Progress Bar Card
            if (_isDownloading)
              Card(
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFBFDBFE)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _statusMessage,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1E3A8A),
                            ),
                          ),
                          Text(
                            '${(_downloadProgress * 100).toInt()}%',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: _downloadProgress > 0 ? _downloadProgress : null,
                          minHeight: 8,
                          backgroundColor: const Color(0xFFDBEAFE),
                          valueColor: const AlwaysStoppedAnimation(Color(0xFF2563EB)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Video Details & Download Options
            if (_videoDetails != null) ...[
              const SizedBox(height: 16),
              Card(
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Video Thumbnail & Details
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          _videoDetails!.thumbnails.highResUrl,
                          fit: BoxFit.cover,
                          height: 180,
                          width: double.infinity,
                          errorBuilder: (ctx, err, stack) => Container(
                            height: 180,
                            color: Colors.black12,
                            child: const Center(child: Icon(Icons.movie, size: 48)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _videoDetails!.title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Author: ${_videoDetails!.author} • Duration: ${_videoDetails!.duration?.inMinutes ?? 0}m',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                      const Divider(height: 24),

                      // Download Action Buttons
                      const Text(
                        'Download Options:',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 10),

                      // Video (MP4) Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: _isDownloading
                              ? null
                              : () => _downloadYouTubeStream(audioOnly: false),
                          icon: const Icon(Icons.video_library),
                          label: Text(
                            _selectedMuxedStream != null
                                ? 'Download MP4 (${_selectedMuxedStream!.videoQualityLabel} • ${(_selectedMuxedStream!.size.totalMegaBytes).toStringAsFixed(1)} MB)'
                                : 'Download MP4 Video',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF16A34A),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Audio (MP3) Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton.icon(
                          onPressed: _isDownloading
                              ? null
                              : () => _downloadYouTubeStream(audioOnly: true),
                          icon: const Icon(Icons.audiotrack, color: Color(0xFF2563EB)),
                          label: Text(
                            _selectedAudioStream != null
                                ? 'Download Audio Only (${(_selectedAudioStream!.size.totalMegaBytes).toStringAsFixed(1)} MB)'
                                : 'Download Audio Track',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF2563EB)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
