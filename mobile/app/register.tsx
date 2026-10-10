import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const NAVY = '#17324D';
const TEAL = '#2D8C83';

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'team' ? 'Team Member' : 'Associate Member';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  function submit() {
    if (!name.trim() || !phone.trim() || !email.trim() || !password) {
      Alert.alert('Missing information', 'Please complete all required fields.');
      return;
    }
    if (role === 'Team Member' && !code.trim()) {
      Alert.alert('Authorization code required', 'Enter the code provided by the owner to register as a Team Member.');
      return;
    }
    Alert.alert('UI preview only', 'Registration is not connected to the backend yet. The server-side validation will be implemented next.');
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹  Back</Text></Pressable>
      <View style={styles.badge}><Text style={styles.badgeText}>{role}</Text></View>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Enter your details to get started. Your information should be accurate and kept secure.</Text>
      <View style={styles.form}>
        <Field label="Full name" value={name} onChangeText={setName} placeholder="Enter your full name" />
        <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="Enter phone number" keyboardType="phone-pad" />
        <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry />
        {role === 'Team Member' && <Field label="Owner authorization code" value={code} onChangeText={setCode} placeholder="Enter your invitation code" autoCapitalize="characters" />}
        <Text style={styles.note}>{role === 'Team Member' ? 'A valid owner-issued code is required. The server will verify it before assigning your role.' : 'Associate accounts are independent and cannot add members or create a team.'}</Text>
        <Pressable style={styles.button} onPress={submit}><Text style={styles.buttonText}>Create account</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string; keyboardType?: 'default' | 'email-address' | 'phone-pad'; secureTextEntry?: boolean; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters' }) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#9AA6B2" autoCapitalize={props.autoCapitalize ?? 'sentences'} /></View>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, paddingTop: 54, backgroundColor: '#F5F7FA' },
  back: { color: TEAL, fontSize: 15, fontWeight: '700', marginBottom: 30 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#E0F2EF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginBottom: 15 },
  badgeText: { color: '#236D66', fontSize: 12, fontWeight: '700' },
  title: { color: NAVY, fontSize: 29, lineHeight: 36, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 23 },
  form: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6EBF0', padding: 18 },
  field: { marginBottom: 15 },
  label: { color: NAVY, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { borderWidth: 1, borderColor: '#DCE4EB', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 13, color: NAVY, fontSize: 14, backgroundColor: '#FFFFFF' },
  note: { color: '#64748B', fontSize: 12, lineHeight: 18, marginBottom: 17 },
  button: { backgroundColor: TEAL, borderRadius: 12, alignItems: 'center', paddingVertical: 15 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 }
});
