/**
 * This file is part of alf.io.
 *
 * alf.io is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * alf.io is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with alf.io.  If not, see <http://www.gnu.org/licenses/>.
 */
package alfio.manager.system;

import alfio.model.Configurable;
import alfio.model.system.ConfigurationKeys;
import alfio.repository.user.OrganizationRepository;
import org.apache.commons.lang3.ArrayUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;
import org.springframework.mail.MailParseException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.MimeMessagePreparator;

import jakarta.activation.FileTypeMap;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;

import static alfio.model.system.ConfigurationKeys.*;
import static java.nio.charset.StandardCharsets.UTF_8;

class SmtpMailer extends BaseMailer {

    private static final Logger log = LoggerFactory.getLogger(SmtpMailer.class);
    private final ConfigurationManager configurationManager;

    SmtpMailer(ConfigurationManager configurationManager,
               OrganizationRepository organizationRepository) {
        super(organizationRepository);
        this.configurationManager = configurationManager;
    }

    @Override
    public void send(Configurable configurable, String fromName, String to, List<String> cc, String subject, String text,
                     Optional<String> html, Attachment... attachments) {

        var conf = configurationManager.getFor(Set.of(SMTP_FROM_EMAIL, MAIL_REPLY_TO,
            MAIL_SET_ORG_REPLY_TO, SMTP_HOST, SMTP_PORT, SMTP_PROTOCOL,
            SMTP_USERNAME, SMTP_PASSWORD, SMTP_PROPERTIES,
            SMTP_MESSAGE_ID_DOMAIN, SMTP_LOCALHOST, SMTP_LOCALADDRESS, SMTP_QUITWAIT), configurable.getConfigurationLevel());

        MimeMessagePreparator preparator = mimeMessage -> {

            MimeMessageHelper message = html.isPresent() || !ArrayUtils.isEmpty(attachments) ? new MimeMessageHelper(mimeMessage, true, UTF_8.name())
                    : new MimeMessageHelper(mimeMessage, UTF_8.name());
            message.setSubject(subject);
            message.setFrom(conf.get(SMTP_FROM_EMAIL).getRequiredValue(), fromName);
            setReplyToIfPresent(conf, configurable.getOrganizationId(), replyTo -> {
                try {
                    message.setReplyTo(replyTo);
                } catch (MessagingException e) {
                    throw new RuntimeException(e);
                }
            });
            message.setTo(to);
            if(cc != null && !cc.isEmpty()){
                message.setCc(cc.toArray(new String[0]));
            }
            if (html.isPresent()) {
                message.setText(text, html.get());
            } else {
                message.setText(text, false);
            }

            if (attachments != null) {
                for (Attachment a : attachments) {
                    message.addAttachment(a.getFilename(), new ByteArrayResource(a.getSource()), a.getContentType());
                }
            }
            
            message.getMimeMessage().saveChanges();
            String messageIdDomain = conf.get(SMTP_MESSAGE_ID_DOMAIN).getValueOrNull();
            if (messageIdDomain == null || messageIdDomain.isBlank()) {
                messageIdDomain = conf.get(SMTP_HOST).getRequiredValue();
            }
            String messageId = message.getMimeMessage().getMessageID();
            if (messageId != null) {
                int at = messageId.lastIndexOf('@');
                if (at > 0) {
                    message.getMimeMessage().setHeader("Message-ID",
                        messageId.substring(0, at + 1) + messageIdDomain + (messageId.endsWith(">") ? ">" : ""));
                }
            }
        };
        toMailSender(conf).send(preparator);
    }
    
    private static JavaMailSender toMailSender(Map<ConfigurationKeys, ConfigurationManager.MaybeConfiguration> conf) {
        JavaMailSenderImpl r = new CustomJavaMailSenderImpl();
        r.setDefaultEncoding(UTF_8.name());

        r.setHost(conf.get(SMTP_HOST).getRequiredValue());
        r.setPort(Integer.parseInt(conf.get(SMTP_PORT).getRequiredValue()));
        r.setProtocol(conf.get(SMTP_PROTOCOL).getRequiredValue());

        String username = conf.get(SMTP_USERNAME).getValueOrNull();
        String password = conf.get(SMTP_PASSWORD).getValueOrNull();

        r.setUsername(username);
        r.setPassword(password);

        boolean hasCredentials = username != null && !username.isBlank() && password != null && !password.isBlank();

        String properties = conf.get(SMTP_PROPERTIES).getValueOrNull();

        Properties mailProperties = new Properties();

        if (properties != null) {
            try {
                mailProperties.putAll(PropertiesLoaderUtils.loadProperties(
                    new EncodedResource(
                        new ByteArrayResource(properties.getBytes(UTF_8)),
                        UTF_8.name()
                    )
                ));
            } catch (IOException e) {
                log.warn("error while setting the mail sender properties", e);
            }
        }

        
        mailProperties.put("mail.smtp.auth", Boolean.toString(hasCredentials));
        if (hasCredentials && "smtps".equalsIgnoreCase(conf.get(SMTP_PROTOCOL).getRequiredValue())) {
            mailProperties.put("mail.smtps.auth", "true");
        }
        mailProperties.put("mail.smtp.sendpartial", "false");
        mailProperties.put("mail.smtp.quitwait", "false");

        String localhost = conf.get(SMTP_LOCALHOST).getValueOrNull();
        if (localhost != null && !localhost.isBlank()) {
            mailProperties.put("mail.smtp.localhost", localhost);
        }

        r.setJavaMailProperties(mailProperties);
        return r;
    }
    
    static class CustomMimeMessage extends MimeMessage {
        
        private String defaultEncoding;
        private FileTypeMap defaultFileTypeMap;

        CustomMimeMessage(Session session, String defaultEncoding, FileTypeMap defaultFileTypeMap) {
            super(session);
            this.defaultEncoding = defaultEncoding;
            this.defaultFileTypeMap = defaultFileTypeMap;
        }

        CustomMimeMessage(Session session, InputStream contentStream) throws MessagingException {
            super(session, contentStream);
        }
        
        public final String getDefaultEncoding() {
            return this.defaultEncoding;
        }

        public final FileTypeMap getDefaultFileTypeMap() {
            return this.defaultFileTypeMap;
        }
        
        // @Override
        // protected void updateMessageID() throws MessagingException {
        //     removeHeader("Message-Id");
        // }
        
        // @Override
        // public void setHeader(String name, String value) throws MessagingException {
        //     if(!"Message-Id".equals(name)) {
        //         super.setHeader(name, value);
        //     }
        // }
    }
    
    static class CustomJavaMailSenderImpl extends JavaMailSenderImpl {
        @Override
        public MimeMessage createMimeMessage() {
            return new CustomMimeMessage(getSession(), getDefaultEncoding(), getDefaultFileTypeMap());
        }
        
        @Override
        public MimeMessage createMimeMessage(InputStream contentStream) {
            try {
                return new CustomMimeMessage(getSession(), contentStream);
            }
            catch (MessagingException ex) {
                throw new MailParseException("Could not parse raw MIME content", ex);
            }
        }
    }

}
