import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen() {
  return <View style={styles.page}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹  Back</Text></Pressable><Text style={styles.title}>Sign in</Text><Text style={styles.subtitle}>The sign-in form and secure session handling will be connected when we implement the backend authentication APIs.</Text><View style={styles.card}><Text style={styles.cardTitle}>Next step</Text><Text style={styles.text}>We'll add email/phone login, password verification, rate limiting, and role-based navigation.</Text></View></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, padding: 24, paddingTop: 54, backgroundColor: '#F5F7FA' }, back: { color: '#2D8C83', fontSize: 15, fontWeight: '700', marginBottom: 30 }, title: { color: '#17324D', fontSize: 30, fontWeight: '700' }, subtitle: { color: '#64748B', fontSize: 14, lineHeight: 22, marginTop: 10 }, card: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E6EBF0', padding: 18, marginTop: 24 }, cardTitle: { color: '#17324D', fontSize: 17, fontWeight: '700' }, text: { color: '#64748B', fontSize: 13, lineHeight: 20, marginTop: 8 } });
