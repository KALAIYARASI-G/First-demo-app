import 'dart:async';
import 'package:flutter/material';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../services/socket_service.dart';

class MapTrackingScreen extends StatefulWidget {
  const MapTrackingScreen({super.key});

  @override
  State<MapTrackingScreen> createState() => _MapTrackingScreenState();
}

class _MapTrackingScreenState extends State<MapTrackingScreen> {
  LatLng _currentLocation = const LatLng(37.7749, -122.4194);
  bool _isSharing = false;
  Timer? _timer;
  late int userId;
  late String username;
  late String token;
  bool _isInit = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInit) {
      final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      userId = args['userId'];
      username = args['username'];
      token = args['token'];
      _isInit = true;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _toggleSharing() async {
    if (_isSharing) {
      _timer?.cancel();
      setState(() {
        _isSharing = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Stopped sharing live location.')),
      );
    } else {
      // Ask for permission and start location updates
      bool serviceEnabled;
      LocationPermission permission;

      serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        // Services aren't enabled, fallback to simulated updates
        _startSimulatedSharing();
        return;
      }

      permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          // Permissions denied, fallback to simulated updates
          _startSimulatedSharing();
          return;
        }
      }
      
      setState(() {
        _isSharing = true;
      });

      // Periodically fetch position and send to socket
      _timer = Timer.periodic(const Duration(seconds: 3), (timer) async {
        try {
          Position position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
          );
          setState(() {
            _currentLocation = LatLng(position.latitude, position.longitude);
          });
          SocketService().updateLocation(userId, position.latitude, position.longitude);
        } catch (e) {
          // Fallback to auto-drift on failure
          _simulateStep();
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sharing real-time GPS coordinates...')),
      );
    }
  }

  void _startSimulatedSharing() {
    setState(() {
      _isSharing = true;
    });
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) {
      _simulateStep();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('GPS services unavailable. Started mock GPS simulation.')),
    );
  }

  void _simulateStep() {
    setState(() {
      // Introduce slight randomness to simulate motion
      _currentLocation = LatLng(
        _currentLocation.latitude + (0.0005 - (0.001 * (userId % 2))),
        _currentLocation.longitude + 0.0004,
      );
    });
    SocketService().updateLocation(userId, _currentLocation.latitude, _currentLocation.longitude);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Location Transmission'),
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: _currentLocation,
              initialZoom: 14.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.livetrack.app',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentLocation,
                    width: 40,
                    height: 40,
                    child: const Icon(
                      Icons.my_location,
                      color: Colors.red,
                      size: 30,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Positioned(
            bottom: 20,
            left: 20,
            right: 20,
            child: Card(
              color: const Color(0xFF151D30).withOpacity(0.9),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFF2E3E60)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _isSharing ? 'TRANSMITTING GPS SIGNAL' : 'TRANSMISSION OFFLINE',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _isSharing ? Colors.green : Colors.red,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Latitude: ${_currentLocation.latitude.toStringAsFixed(5)}\nLongitude: ${_currentLocation.longitude.toStringAsFixed(5)}',
                      textAlign: Center,
                      style: const TextStyle(fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _toggleSharing,
                      icon: Icon(_isSharing ? Icons.portable_wifi_off : Icons.wifi),
                      label: Text(_isSharing ? 'Stop Transmitting' : 'Start Transmitting'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isSharing ? Colors.red : const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(50),
                      ),
                    )
                  ],
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}
