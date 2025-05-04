import { ContainerModule } from 'inversify';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { CommandContribution } from '@theia/core/lib/common/command';
import { MenuContribution } from '@theia/core/lib/common/menu';
import { LanguageClientContribution } from '@theia/languages/lib/browser';

import { Context7Symbol, Context7Service } from '../common/context7-protocol';
import { Context7FrontendContribution } from './context7-frontend-contribution';
import { Context7HoverProvider } from './context7-hover-provider';
import { Context7CompletionProvider } from './context7-completion-provider';
import { Context7CodeActionProvider } from './context7-code-action-provider';
import { Context7DecorationProvider } from './context7-decoration-provider';

export default new ContainerModule(bind => {
    // Bind the frontend contribution (commands, menus, etc.)
    bind(Context7FrontendContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(Context7FrontendContribution);
    bind(MenuContribution).toService(Context7FrontendContribution);
    
    // Bind editor integrations
    bind(Context7HoverProvider).toSelf().inSingletonScope();
    bind(Context7CompletionProvider).toSelf().inSingletonScope();
    bind(Context7CodeActionProvider).toSelf().inSingletonScope();
    bind(Context7DecorationProvider).toSelf().inSingletonScope();
    
    // Connect to the backend service via WebSockets
    bind(Context7Service).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<Context7Service>(
            '/services/context7', 
            Context7Symbol
        );
    }).inSingletonScope();
});