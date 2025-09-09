import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  StatusBar,
  Dimensions
} from 'react-native';
import { NativeModules } from 'react-native';

interface App {
  appName: string;
  packageName: string;
  icon: string;
  tag: string;
}

interface Package {
  name: string;
  type: string;
  url?: string;
}

const { width: screenWidth } = Dimensions.get('window');

const HomeScreen = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [filteredApps, setFilteredApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'react-native' | 'flutter'>('all');

  const fetchApps = async () => {
    try {
      setLoadingApps(true);
      const appsData = await NativeModules.AppChecker.getAppTechnologies();
      setApps(appsData);
      filterApps(appsData, activeTab);
    } catch (error) {
      console.error('Error fetching apps:', error);
      Alert.alert('Error', 'Failed to fetch apps');
    } finally {
      setLoadingApps(false);
      setRefreshing(false);
    }
  };

  const filterApps = (appsData: App[], tab: 'all' | 'react-native' | 'flutter') => {
    let filtered = appsData;
    
    if (tab === 'react-native') {
      filtered = appsData.filter(app => app.tag === 'React Native');
    } else if (tab === 'flutter') {
      filtered = appsData.filter(app => app.tag === 'Flutter');
    }
    
    setFilteredApps(filtered);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    filterApps(apps, activeTab);
  }, [activeTab, apps]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApps();
  };

  const handleTabPress = (tab: 'all' | 'react-native' | 'flutter') => {
    setActiveTab(tab);
  };

  const handleAppPress = async (app: App) => {
    setSelectedApp(app);
    setModalVisible(true);
    setLoadingPackages(true);
    setPackages([]);
    
    try {
      const appPackages = await NativeModules.AppChecker.getAppPackages(app.packageName);
      setPackages(appPackages);
    } catch (error) {
      console.error('Error fetching packages:', error);
      Alert.alert('Error', 'Failed to fetch app packages');
    } finally {
      setLoadingPackages(false);
    }
  };

  const openPackageUrl = (url: string) => {
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', `Cannot open URL: ${url}`);
        }
      });
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedApp(null);
    setPackages([]);
  };

  const getPackageTypeColor = (type: string) => {
    switch (type) {
      case 'React Native Package':
        return {
          background: '#61DAFB',
          shadow: '#4FC3F7'
        };
      case 'Flutter Package':
        return {
          background: '#02569B',
          shadow: '#1976D2'
        };
      case 'Native Library':
        return {
          background: '#FF6B35',
          shadow: '#FF8A65'
        };
      default:
        return {
          background: '#9E9E9E',
          shadow: '#BDBDBD'
        };
    }
  };

  const getAppCount = () => {
    const reactNativeCount = apps.filter(app => app.tag === 'React Native').length;
    const flutterCount = apps.filter(app => app.tag === 'Flutter').length;
    return { reactNativeCount, flutterCount, total: apps.length };
  };

  const renderHeader = () => {
    const { reactNativeCount, flutterCount, total } = getAppCount();
    
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Know Technology</Text>
          <Text style={styles.headerSubtitle}>
            Discover which apps use React Native or Flutter
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{total}</Text>
              <Text style={styles.statLabel}>Total Apps</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#61DAFB' }]}>{reactNativeCount}</Text>
              <Text style={styles.statLabel}>React Native</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#02569B' }]}>{flutterCount}</Text>
              <Text style={styles.statLabel}>Flutter</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        onPress={() => handleTabPress('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
          All Apps ({apps.length})
        </Text>
        {activeTab === 'all' && <View style={styles.tabIndicator} />}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'react-native' && styles.activeTab]}
        onPress={() => handleTabPress('react-native')}
      >
        <Text style={[styles.tabText, activeTab === 'react-native' && styles.activeTabText]}>
          React Native ({getAppCount().reactNativeCount})
        </Text>
        {activeTab === 'react-native' && <View style={[styles.tabIndicator, { backgroundColor: '#61DAFB' }]} />}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'flutter' && styles.activeTab]}
        onPress={() => handleTabPress('flutter')}
      >
        <Text style={[styles.tabText, activeTab === 'flutter' && styles.activeTabText]}>
          Flutter ({getAppCount().flutterCount})
        </Text>
        {activeTab === 'flutter' && <View style={[styles.tabIndicator, { backgroundColor: '#02569B' }]} />}
      </TouchableOpacity>
    </View>
  );

  const renderAppItem = (app: App, index: number) => {
    const colors = getPackageTypeColor(app.tag);
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.appItem, { 
          borderLeftColor: colors.background,
          shadowColor: colors.shadow 
        }]}
        onPress={() => handleAppPress(app)}
      >
        <View style={styles.appItemContent}>
          <View style={styles.appIconContainer}>
            <Image
              source={{ uri: `data:image/png;base64,${app.icon}` }}
              style={styles.appIcon}
              onError={() => console.log('Error loading icon for', app.appName)}
            />
            <View style={[styles.techBadge, { backgroundColor: colors.background }]}>
              <Text style={styles.techBadgeText}>
                {app.tag === 'React Native Package' ? 'RN' : app.tag === 'Flutter Package' ? 'FL' : 'N'}
              </Text>
            </View>
          </View>
          
          <View style={styles.appInfo}>
            <Text style={styles.appName} numberOfLines={1} ellipsizeMode="tail">
              {app.appName}
            </Text>
            <Text style={styles.packageName} numberOfLines={1} ellipsizeMode="tail">
              {app.packageName}
            </Text>
            <View style={[styles.tagContainer, { backgroundColor: colors.background }]}>
              <Text style={styles.tagText}>{app.tag}</Text>
            </View>
          </View>
          
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPackageItem = (pkg: Package, index: number) => {
    const colors = getPackageTypeColor(pkg.type);
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.packageItem, {
          backgroundColor: pkg.url ? '#f8f9ff' : '#f8f9fa'
        }]}
        onPress={() => pkg.url && openPackageUrl(pkg.url)}
        disabled={!pkg.url}
      >
        <View style={styles.packageContent}>
          <View style={styles.packageInfo}>
            <Text style={styles.packageNameText} numberOfLines={1} ellipsizeMode="tail">
              {pkg.name}
            </Text>
            {/* <View style={[styles.packageTypeTag, { backgroundColor: colors.background }]}>
              <Text style={styles.packageTypeText}>{pkg.type}</Text>
            </View> */}
          </View>
          <View style={styles.packageActions}>
            {pkg.url && (
              <View style={styles.linkIndicator}>
                <Text style={styles.linkIcon}>🌐</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIcon}>
        <Text style={styles.emptyStateEmoji}>📱</Text>
      </View>
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'all' 
          ? 'No Apps Found' 
          : `No ${activeTab === 'react-native' ? 'React Native' : 'Flutter'} Apps Found`
        }
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {activeTab === 'all' 
          ? 'Try refreshing to scan for apps'
          : `Switch to "All Apps" to see other technologies`
        }
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={handleRefresh}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.emptyStateButtonText}>Refresh Apps</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      
      {renderHeader()}
      {renderTabs()}

      {loadingApps ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Scanning installed apps...</Text>
          <Text style={styles.loadingSubtext}>This may take a moment</Text>
        </View>
      ) : filteredApps.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4A90E2']}
              tintColor="#4A90E2"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredApps.map(renderAppItem)}
        </ScrollView>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalAppInfo}>
                {selectedApp && (
                  <>
                    <Image
                      source={{ uri: `data:image/png;base64,${selectedApp.icon}` }}
                      style={styles.modalAppIcon}
                    />
                    <View style={styles.modalAppTextContainer}>
                      <Text style={styles.modalAppName} numberOfLines={1} ellipsizeMode="tail">
                        {selectedApp.appName}
                      </Text>
                      <Text style={styles.modalPackageName} numberOfLines={1} ellipsizeMode="tail">
                        {selectedApp.packageName}
                      </Text>
                      <View style={[
                        styles.modalTechTag, 
                        { backgroundColor: getPackageTypeColor(selectedApp.tag).background }
                      ]}>
                        <Text style={styles.modalTechTagText}>{selectedApp.tag}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <Text style={styles.packagesTitle}>
              📦 Packages & Libraries ({packages.length})
            </Text>

            {loadingPackages ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Analyzing packages...</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Text style={styles.modalEmptyIcon}>🔍</Text>
                <Text style={styles.modalEmptyText}>No packages detected</Text>
                <Text style={styles.modalEmptySubtext}>This app might use custom libraries</Text>
              </View>
            ) : (
              <ScrollView style={styles.packagesScrollView} showsVerticalScrollIndicator={false}>
                {packages.map(renderPackageItem)}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    backgroundColor: '#4A90E2',
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 25,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#f8f9fa',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#333',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 20,
    paddingTop: 25,
  },
  appItem: {
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  appItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  techBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  techBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  packageName: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  tagContainer: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateEmoji: {
    fontSize: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: screenWidth * 0.92,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalAppInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  modalAppIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 16,
  },
  modalAppTextContainer: {
    flex: 1,
  },
  modalAppName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalPackageName: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  modalTechTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  modalTechTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  packagesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  modalEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  packagesScrollView: {
    maxHeight: 350,
  },
  packageItem: {
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  packageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  packageNameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  packageTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  packageTypeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  packageActions: {
    marginLeft: 12,
  },
  linkIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkIcon: {
    fontSize: 14,
  },
});

export default HomeScreen;