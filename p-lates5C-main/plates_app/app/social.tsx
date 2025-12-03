import React from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    ImageSourcePropType,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { SceneMap, TabBar, TabView } from 'react-native-tab-view';

// --- Types ---
type User = {
  id: string;
  username: string;
  fullname: string;
  avatar: ImageSourcePropType;
  isFollowing: boolean;
};

// --- Avatar Size ---
const AVATAR_SIZE = 56;

// --- Mock Data -----------------------------------------
const mockFollowers: User[] = [
  {
    id: '1',
    username: 'marvin_gaye',
    fullname: 'Marvin Gaye',
    avatar: require('../assets/images/mock-data/user1.png'),
    isFollowing: false,
  },
  {
    id: '2',
    username: 'demi',
    fullname: 'Demi Lovato',
    avatar: require('../assets/images/mock-data/user2.png'),
    isFollowing: false,
  },
  {
    id: '3',
    username: 'badgalriri',
    fullname: 'Rihanna',
    avatar: require('../assets/images/mock-data/user3.png'),
    isFollowing: true,
  },
];

const mockFollowing: User[] = [
  {
    id: '101',
    username: 'idriselba',
    fullname: 'Idris Elba',
    avatar: require('../assets/images/mock-data/user6.png'),
    isFollowing: true,
  },
  {
    id: '102',
    username: 'issarae',
    fullname: 'Issa Rae',
    avatar: require('../assets/images/mock-data/user7.png'),
    isFollowing: true,
  },
];
// -----------------------------------------------------------

// --- List Item Component (New Design) ---
type UserItemProps = {
  user: User;
  listType: 'followers' | 'following';
};

const UserItem = ({ user, listType }: UserItemProps) => {
  const renderButton = () => {
    if (listType === 'following') {
      return (
        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Following</Text>
        </TouchableOpacity>
      );
    }
    if (user.isFollowing) {
      return (
        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Message</Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity style={styles.filledButton}>
          <Text style={styles.filledButtonText}>Follow</Text>
        </TouchableOpacity>
      );
    }
  };

  const initials = user.fullname
    ? user.fullname.split(' ').map((p) => p[0]).slice(0, 2).join('')
    : user.username.slice(0, 2).toUpperCase();

  return (
    <View style={styles.row}>
      {/* Avatar */}
      {user.avatar ? (
        <Image
          source={user.avatar}
          style={styles.avatar}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{initials}</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.fullname}>{user.fullname}</Text>
      </View>

      {/* Action */}
      {renderButton()}
    </View>
  );
};

// --- Tab Components ---
const FollowersList = () => (
  <FlatList
    data={mockFollowers}
    renderItem={({ item }) => <UserItem user={item} listType="followers" />}
    keyExtractor={(item) => item.id}
    contentContainerStyle={{ flexGrow: 1 }}
    style={styles.list}
    ItemSeparatorComponent={() => <View style={styles.separator} />}
  />
);

const FollowingList = () => (
  <FlatList
    data={mockFollowing}
    renderItem={({ item }) => <UserItem user={item} listType="following" />}
    keyExtractor={(item) => item.id}
    contentContainerStyle={{ flexGrow: 1 }}
    style={styles.list}
    ItemSeparatorComponent={() => <View style={styles.separator} />}
  />
);

// Renders the scenes for the TabView
const renderScene = SceneMap({
  followers: FollowersList,
  following: FollowingList,
});

// --- Main Tab View Screen ---
export default function SocialScreen() {
  const { initialRoute } = useLocalSearchParams<{ initialRoute?: string }>();

  const [index, setIndex] = React.useState(initialRoute === 'following' ? 1 : 0);
  const [routes] = React.useState([
    { key: 'followers', title: 'Followers' },
    { key: 'following', title: 'Following' },
  ]);

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: 'black' }}
            style={{ backgroundColor: 'white' }}
            activeColor="black"
            inactiveColor="gray"
          />
        )}
      />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingRight: 16,
    backgroundColor: '#fff',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 12,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 12,
    backgroundColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontWeight: '700',
    color: '#333',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  fullname: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  filledButton: {
    backgroundColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filledButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  outlineButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
});