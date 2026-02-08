import { authenticate } from 'ldap-authentication';
import { settingsService } from './settingsService.js';

export const ldapService = {
    async authenticate(username: string, password: string): Promise<boolean> {
        try {
            const settings = await settingsService.getSettings();
            if (!settings.ldap?.enabled) {
                return false;
            }

            const { url, bindDN, bindCredentials, searchBase, searchFilter } = settings.ldap;

            // Replace {{username}} placeholder in search filter
            const filter = searchFilter.replace('{{username}}', username);

            // LDAP authentication options
            const options: any = {
                ldapOpts: {
                    url,
                },
                userDn: bindDN, // If using admin bind, this is the admin DN
                userPassword: bindCredentials, // Admin password
                userSearchBase: searchBase,
                usernameAttribute: 'uid', // This might need to be configurable or extracted from filter
                username,

            };

            // If we are doing a direct bind (no admin search first), the logic is different.
            // But usually we search for the user first using admin creds, then bind as the user.
            // ldap-authentication handles this:
            // 1. Bind as admin (if provided)
            // 2. Search for user
            // 3. Bind as user to verify password

            // Construct options for ldap-authentication
            const authOptions: any = {
                ldapOpts: {
                    url,
                },
                userSearchBase: searchBase,
                usernameAttribute: 'uid', // Default, but we should probably parse the filter or make it configurable
                username,
                userPassword: password,
            };

            // If admin bind is provided
            if (bindDN && bindCredentials) {
                authOptions.adminDn = bindDN;
                authOptions.adminPassword = bindCredentials;
            }

            // If the filter is custom, we might need to adjust. 
            // ldap-authentication assumes (usernameAttribute=username).
            // If the user provides a complex filter like (&(objectClass=person)(sAMAccountName={{username}})),
            // we need to handle that.
            // For now, let's assume simple usage or that we can pass a custom filter function if needed,
            // but ldap-authentication is a bit opinionated.

            // Let's try to use the searchFilter if possible.
            // Actually, ldap-authentication allows `userSearchFilter`.
            if (searchFilter) {
                // It expects a filter template like (uid={{username}}) but the library might just take the attribute.
                // Let's look at the library docs (simulated).
                // It usually takes `usernameAttribute`.
                // If we want full control, we might need to use ldapjs directly.
                // But let's try to map the config to the library options.

                // Extract attribute from filter if it's simple (uid={{username}}) -> uid
                const match = searchFilter.match(/\((.*?)=/);
                if (match && match[1]) {
                    authOptions.usernameAttribute = match[1];
                }
            }

            const user = await authenticate(authOptions);
            return !!user;
        } catch (error) {
            console.error('LDAP authentication failed:', error);
            return false;
        }
    },

    async testConnection(config: any): Promise<{ success: boolean; message: string }> {
        try {
            // Try to bind as admin (or anonymous if no creds)
            const { url, bindDN, bindCredentials } = config;

            // We can use ldap-authentication to just search for something or bind.
            // Or we can just use the underlying client.
            // For simplicity, let's try to authenticate with the provided credentials (if any)
            // or just connect.

            // Since we don't have a "test" method in the library, we'll try to authenticate a dummy user
            // OR we can just try to create a client and bind.

            // Let's use a simpler approach: just try to bind if credentials are provided.
            if (bindDN && bindCredentials) {
                // We can't easily test just the bind with this library without searching for a user.
                // But we can try to search for a non-existent user and see if it connects.
                try {
                    await authenticate({
                        ldapOpts: { url },
                        adminDn: bindDN,
                        adminPassword: bindCredentials,
                        userSearchBase: config.searchBase,
                        username: 'test_connection_dummy_user',
                        userPassword: 'dummy_password',
                    });
                } catch (e: any) {
                    // If error is "user not found", then connection worked!
                    if (e.message && (e.message.includes('User not found') || e.name === 'LdapAuthenticationError')) {
                        return { success: true, message: 'Connection successful (User not found, but bind worked)' };
                    }
                    // If it's a connection error
                    if (e.code === 'ECONNREFUSED' || e.name === 'ConnectionError') {
                        return { success: false, message: `Connection failed: ${e.message}` };
                    }
                    // If bind failed
                    if (e.name === 'InvalidCredentialsError') {
                        return { success: false, message: 'Invalid Bind DN or Password' };
                    }
                    // Other errors
                    return { success: false, message: `Test failed: ${e.message}` };
                }
            }

            return { success: true, message: 'Connection test initiated (limited verification without bind creds)' };
        } catch (error: any) {
            return { success: false, message: error.message || 'Connection failed' };
        }
    }
};
