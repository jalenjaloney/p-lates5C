import React from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { SceneMap, TabBar, TabView } from 'react-native-tab-view';
import { supabase, hasSupabaseConfig } from '../src/supabaseClient';
import { UserAuth } from '../src/context/AuthContext';
import { UI } from '@/constants/ui';

// --- Types ---
type User = {
  user_id: string;
  handle: string;
  full_name: string;
  avatar_url?: string | null;
};

// --- Avatar Size ---
const AVATAR_SIZE = 56;

type UserItemProps = {
  user: User;
  listType: 'followers' | 'following';
  isFollowing: boolean;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
};

// --- List Item Component ---
const UserItem = ({ user, listType, isFollowing, onToggleFollow }: UserItemProps) => {
  const renderButton = () => {
    if (listType === 'following') {
      return (
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => onToggleFollow(user.user_id, true)}
        >
          <Text style={styles.outlineButtonText}>Following</Text>
        </TouchableOpacity>
      );
    }
    if (isFollowing) {
      return (
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => onToggleFollow(user.user_id, true)}
        >
          <Text style={styles.outlineButtonText}>Following</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={styles.filledButton}
        onPress={() => onToggleFollow(user.user_id, false)}
      >
        <Text style={styles.filledButtonText}>Follow</Text>
      </TouchableOpacity>
    );
  };

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
    : user.handle.replace(/^@/, '').slice(0, 2).toUpperCase();

  return (
    <View style={styles.row}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} resizeMode="cover" />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{initials}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.username}>{user.handle}</Text>
        <Text style={styles.fullname}>{user.full_name || 'Unnamed'}</Text>
      </View>

      {renderButton()}
    </View>
  );
};

export default function SocialScreen() {
  const { initialRoute } = useLocalSearchParams<{ initialRoute?: string }>();
  const { session } = UserAuth();
  const currentUserId = session?.user?.id;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [followers, setFollowers] = React.useState<User[]>([]);
  const [following, setFollowing] = React.useState<User[]>([]);
  const [followingIds, setFollowingIds] = React.useState(new Set<string>());

  const [index, setIndex] = React.useState(initialRoute === 'following' ? 1 : 0);
  const [routes] = React.useState([
    { key: 'followers', title: 'Followers' },
    { key: 'following', title: 'Following' },
  ]);

  const loadSocial = React.useCallback(async () => {
    if (!currentUserId || !hasSupabaseConfig || !supabase) return;
    setLoading(true);
    setError('');
    try {
      const [{ data: followerRows, error: followerErr }, { data: followingRows, error: followingErr }] =
        await Promise.all([
          supabase.from('user_follows').select('follower_id').eq('followed_id', currentUserId),
          supabase.from('user_follows').select('followed_id').eq('follower_id', currentUserId),
        ]);
      if (followerErr || followingErr) throw followerErr || followingErr;

      const followerIds = (followerRows || []).map((row) => row.follower_id);
      const followingIdsList = (followingRows || []).map((row) => row.followed_id);
      setFollowingIds(new Set(followingIdsList));

      const profileIds = Array.from(new Set([...followerIds, ...followingIdsList]));
      if (!profileIds.length) {
        setFollowers([]);
        setFollowing([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesErr } = await supabase
        .from('user_profiles')
        .select('user_id, handle, full_name, avatar_url')
        .in('user_id', profileIds);
      if (profilesErr) throw profilesErr;

      const byId = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
      const toUser = (id: string): User => {
        const profile = byId.get(id);
        return {
          user_id: id,
          handle: profile?.handle || `@${id.slice(0, 6)}`,
          full_name: profile?.full_name || '',
          avatar_url: profile?.avatar_url || null,
        };
      };

      setFollowers(followerIds.map(toUser));
      setFollowing(followingIdsList.map(toUser));
    } catch (err) {
      console.error('Failed to load social lists', err);
      setError('Could not load followers right now.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  React.useEffect(() => {
    loadSocial();
  }, [loadSocial]);

  const toggleFollow = async (userId: string, isFollowing: boolean) => {
    if (!currentUserId || !hasSupabaseConfig || !supabase) return;
    if (isFollowing) {
      const { error: delErr } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('followed_id', userId);
      if (delErr) {
        console.error('Unfollow failed', delErr);
        return;
      }
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setFollowing((prev) => prev.filter((user) => user.user_id !== userId));
    } else {
      const { error: insErr } = await supabase
        .from('user_follows')
        .upsert({ follower_id: currentUserId, followed_id: userId });
      if (insErr) {
        console.error('Follow failed', insErr);
        return;
      }
      setFollowingIds((prev) => new Set(prev).add(userId));
      const newUser = followers.find((user) => user.user_id === userId);
      if (newUser) setFollowing((prev) => [newUser, ...prev]);
    }
  };

  const renderScene = SceneMap({
    followers: () => (
      <FlatList
        data={followers}
        renderItem={({ item }) => (
          <UserItem
            user={item}
            listType="followers"
            isFollowing={followingIds.has(item.user_id)}
            onToggleFollow={toggleFollow}
          />
        )}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{ flexGrow: 1 }}
        style={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No followers yet.</Text>
            </View>
          )
        }
      />
    ),
    following: () => (
      <FlatList
        data={following}
        renderItem={({ item }) => (
          <UserItem
            user={item}
            listType="following"
            isFollowing={true}
            onToggleFollow={toggleFollow}
          />
        )}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{ flexGrow: 1 }}
        style={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Not following anyone yet.</Text>
            </View>
          )
        }
      />
    ),
  });

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: UI.colors.ink }}
            style={{ backgroundColor: UI.colors.surface }}
            activeColor={UI.colors.ink}
            inactiveColor={UI.colors.inkMuted}
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
    backgroundColor: UI.colors.background,
    paddingBottom: 110,
  },
  list: {
    backgroundColor: UI.colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingRight: 16,
    backgroundColor: UI.colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.colors.border,
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
    backgroundColor: UI.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontWeight: '700',
    color: UI.colors.ink,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: UI.colors.ink,
    fontFamily: UI.font.body,
  },
  fullname: {
    fontSize: 13,
    color: UI.colors.inkMuted,
    marginTop: 2,
    fontFamily: UI.font.body,
  },
  filledButton: {
    backgroundColor: UI.colors.ink,
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
    borderColor: UI.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  outlineButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  separator: {
    height: 10,
    backgroundColor: 'transparent',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: UI.colors.inkMuted,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fde8e1',
  },
  errorText: {
    color: UI.colors.accentWarm,
    textAlign: 'center',
  },
});
