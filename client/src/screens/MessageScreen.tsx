/**
 * src/screens/MessageScreen.tsx
 * Full message view redesigned to match Velox Mail web thread-pane.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { deleteMessage, getMessage, MessageDetail, SERVER_URL, loadAuth } from '../api/client';
import {
  Colors,
  CATEGORY_COLORS,
  avatarColor,
  initials,
  formatFullTime,
  Radii,
  Shadows,
  Spacing,
  Typography,
} from '../theme';

const ReplyIcon = ({ size = 13, color = Colors.textInv }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <Polyline points="9 17 4 12 9 7"/><Path d="M20 18v-2a4 4 0 00-4-4H4"/>
  </Svg>
);

const ForwardIcon = ({ size = 13, color = Colors.text2 }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <Polyline points="15 17 20 12 15 7"/><Path d="M4 18v-2a4 4 0 014-4h12"/>
  </Svg>
);

const DeleteIcon = ({ size = 13, color = Colors.text2 }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <Polyline points="3 6 5 6 21 6"/>
    <Path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
  </Svg>
);

const ViewOriginalIcon = ({ size = 13, color = Colors.text2 }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><Circle cx="12" cy="12" r="3"/>
  </Svg>
);

const DownloadIcon = ({ size = 14, color = Colors.text2 }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="7 10 12 15 17 10" />
    <Path d="M12 15V3" />
  </Svg>
);

const PreviewIcon = ({ size = 14, color = Colors.text2 }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const isPreviewable = (type?: string) => type?.startsWith('image/');

export default function MessageScreen({ route, navigation }: any) {
  const { id } = route.params as { id: number };
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    loadAuth().then(auth => setAuthToken(auth?.token || null));
  }, []);

  useEffect(() => {
    setShowRaw(false);
    getMessage(id)
      .then(setMessage)
      .catch((e) => {
        Alert.alert('Error', e.message);
        navigation.goBack();
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Delete Message', 'Move this message to trash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleReply = () => {
    if (!message) return;
    navigation.navigate('Compose', {
      to: message.from_addr,
      subject: message.subject ? `Re: ${message.subject}` : '',
    });
  };

  const handleForward = () => {
    if (!message) return;
    navigation.navigate('Compose', {
      to: '',
      subject: message.subject ? `Fwd: ${message.subject}` : '',
    });
  };

  const handleAttachmentPress = async (attId: number) => {
    try {
      const auth = await loadAuth();
      if (!auth) return;
      const url = `${SERVER_URL}/messages/${id}/attachments/${attId}?token=${auth.token}`;
      Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Download Error', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="small" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!message) return null;

  const fromAddr = message.from_addr || (message as any).from || '';
  const toAddr = message.to_addr || (message as any).to || '';
  const avBg = avatarColor(fromAddr);
  const catColor = message.category
    ? (CATEGORY_COLORS[message.category] ?? '#888')
    : null;

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.toolbarActions}>
          <TouchableOpacity
            onPress={handleReply}
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            activeOpacity={0.8}
          >
            <ReplyIcon />
            <Text style={styles.actionBtnPrimaryText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleForward}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <ForwardIcon />
            <Text style={styles.actionBtnText}>Forward</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <DeleteIcon />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
          {message.raw_content ? (
            <TouchableOpacity
              onPress={() => setShowRaw(!showRaw)}
              style={[styles.actionBtn, showRaw && styles.actionBtnPrimary]}
              activeOpacity={0.7}
            >
              <ViewOriginalIcon color={showRaw ? Colors.textInv : Colors.text2} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Thread header */}
        <View style={styles.threadHeader}>
          <Text style={styles.subject}>{message.subject || '(no subject)'}</Text>
          {message.category && catColor && (
            <View
              style={[
                styles.catPill,
                {
                  backgroundColor: catColor + '18',
                  borderColor: catColor + '30',
                },
              ]}
            >
              <Text style={[styles.catPillText, { color: catColor }]}>
                {message.category}
              </Text>
            </View>
          )}
        </View>

        {/* Message card */}
        <View style={styles.messageCard}>
          {/* Message header */}
          <View style={styles.msgHeader}>
            <View style={[styles.msgAvatar, { backgroundColor: avBg }]}>
              <Text style={styles.msgAvatarText}>{initials(fromAddr)}</Text>
            </View>
            <View style={styles.msgSenderBlock}>
              <Text style={styles.msgFrom}>{fromAddr}</Text>
              <Text style={styles.msgTo}>to {toAddr}</Text>
            </View>
            <Text style={styles.msgTime}>{formatFullTime(message.received_at)}</Text>
          </View>
          {/* Message body */}
          <View style={styles.msgBody}>
            {showRaw ? (
              <ScrollView horizontal>
                <View style={styles.rawContainer}>
                  <Text style={styles.rawText}>
                    {message.raw_content}
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.bodyText}>
                {message.body || '(empty message)'}
              </Text>
            )}
            
            {message.attachments && message.attachments.length > 0 && (
              <View style={styles.attachmentsSection}>
                <Text style={styles.attachmentsTitle}>Attachments</Text>
                <View style={styles.attachmentsWrap}>
                  {message.attachments.map((att: any) => {
                    const previewable = isPreviewable(att.content_type);
                    return (
                      <View key={att.id} style={styles.attachmentActions}>
                        {previewable && (
                          <TouchableOpacity 
                            style={styles.attachmentPreviewBtn}
                            onPress={() => setPreviewAtt(att)}
                            activeOpacity={0.7}
                          >
                            <PreviewIcon color={Colors.text1} />
                            <Text style={styles.attachmentPreviewText}>{att.filename}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.attachmentDownloadBtn, !previewable && styles.attachmentDownloadBtnFull]}
                          onPress={() => handleAttachmentPress(att.id)}
                          activeOpacity={0.7}
                        >
                          <DownloadIcon color={Colors.text2} />
                          {!previewable && <Text style={styles.attachmentPreviewText}>{att.filename}</Text>}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Preview Modal */}
      <Modal visible={!!previewAtt} animationType="slide" transparent>
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle} numberOfLines={1}>{previewAtt?.filename}</Text>
            <TouchableOpacity onPress={() => setPreviewAtt(null)} style={styles.previewCloseBtn}>
              <Text style={styles.previewCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.previewContent}>
            {previewAtt && isPreviewable(previewAtt.content_type) && authToken ? (
              <Image 
                source={{ uri: `${SERVER_URL}/messages/${id}/attachments/${previewAtt.id}?token=${authToken}` }} 
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: Colors.textInv, fontSize: 16, fontWeight: '500', marginBottom: 8 }}>No preview available</Text>
                <Text style={{ color: Colors.text3, fontSize: 13, textAlign: 'center' }}>This file type cannot be previewed.{'\n'}Please download it instead.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceThread,
  },
  loadingCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceThread,
  },
  loadingText: {
    fontSize: Typography.base,
    color: Colors.text3,
  },
  /* Toolbar */
  toolbar: {
    backgroundColor: Colors.surface,
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: Spacing.sm,
  },
  backText: {
    fontSize: 20,
    color: Colors.text2,
  },
  toolbarActions: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.accent,
    borderColor: 'transparent',
  },
  actionBtnText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.text2,
  },
  actionBtnPrimaryText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textInv,
  },
  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  /* Thread header */
  threadHeader: {
    gap: Spacing.md,
  },
  subject: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.text1,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  catPill: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  catPillText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  /* Message card */
  messageCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  msgAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: {
    color: Colors.textInv,
    fontWeight: '600',
    fontSize: Typography.md,
  },
  msgSenderBlock: {
    flex: 1,
  },
  msgFrom: {
    fontSize: Typography.md,
    fontWeight: '600',
    color: Colors.text1,
    marginBottom: 2,
  },
  msgTo: {
    fontSize: Typography.sm,
    color: Colors.text3,
  },
  msgTime: {
    fontSize: Typography.sm,
    color: Colors.text3,
  },
  msgBody: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  bodyText: {
    fontSize: Typography.md,
    color: Colors.text1,
    lineHeight: 24,
  },
  rawContainer: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: '100%',
  },
  rawText: {
    color: '#eee',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  attachmentsSection: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attachmentsTitle: {
    fontSize: Typography.base,
    color: Colors.text2,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  attachmentsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  attachmentActions: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  attachmentPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  attachmentDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentDownloadBtnFull: {
    borderRightWidth: 0,
  },
  attachmentPreviewText: {
    color: Colors.text1,
    fontSize: Typography.sm,
    fontWeight: '500',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
  },
  previewTitle: {
    color: Colors.text1,
    fontSize: Typography.base,
    fontWeight: '600',
    maxWidth: '80%',
  },
  previewCloseBtn: {
    padding: 8,
  },
  previewCloseText: {
    color: Colors.text2,
    fontSize: 20,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
