import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const NAVY = '#17324D';
const TEAL = '#2D8C83';

export default function WelcomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>C</Text></View>
      <Text style={styles.eyebrow}>FUNERAL & TRANSPORT SERVICES</Text>
      <Text style={styles.title}>Support when it matters most.</Text>
      <Text style={styles.subtitle}>A respectful, reliable way to coordinate service enquiries and follow their progress.</Text>

      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Welcome</Text>
        <Text style={styles.cardText}>Choose how you want to join the network. Your account will only receive the permissions associated with your verified role.</Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.push('/register?role=associate')}>
          <Text style={styles.primaryButtonText}>Join as Associate</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => router.push('/register?role=team')}>
          <Text style={styles.secondaryButtonText}>Register as Team Member</Text>
          <Text style={styles.helperText}>Owner-issued authorization code required</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.loginLink}>
          <Text style={styles.loginText}>Already registered? Sign in</Text>
        </Pressable>
      </View>
      <Text style={styles.footer}>Private, role-based access · Respectful service coordination</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, paddingTop: 56, justifyContent: 'center' },
  brandMark: { width: 58, height: 58, borderRadius: 18, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  brandMarkText: { color: '#FFFFFF', fontSize: 30, fontWeight: '700' },
  eyebrow: { color: TEAL, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  title: { color: NAVY, fontSize: 34, lineHeight: 41, fontWeight: '700', maxWidth: 330 },
  subtitle: { color: '#64748B', fontSize: 15, lineHeight: 23, marginTop: 14, marginBottom: 28 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: '#E6EBF0' },
  cardTitle: { color: NAVY, fontSize: 20, fontWeight: '700' },
  cardText: { color: '#64748B', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  primaryButton: { backgroundColor: TEAL, paddingVertical: 15, borderRadius: 13, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#D7E0E8', paddingVertical: 14, borderRadius: 13, alignItems: 'center', marginTop: 11 },
  secondaryButtonText: { color: NAVY, fontSize: 14, fontWeight: '700' },
  helperText: { color: '#64748B', fontSize: 11, marginTop: 5 },
  loginLink: { alignItems: 'center', paddingTop: 19 },
  loginText: { color: TEAL, fontSize: 13, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#8794A3', fontSize: 11, marginTop: 24, lineHeight: 17 }
});
