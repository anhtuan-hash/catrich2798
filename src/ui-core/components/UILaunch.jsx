import React, { forwardRef } from 'react';

function classes(...items) {
  return items.filter(Boolean).join(' ');
}

export const UILaunchPage = forwardRef(function UILaunchPage(
  { as: Component = 'div', app, className = '', children, ...props },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={classes('bui-launch', app && `bui-launch--${app}`, className)}
      data-ui="launch"
      data-launch-app={app}
      {...props}
    >
      {children}
    </Component>
  );
});

export const UILaunchHero = forwardRef(function UILaunchHero(
  { as: Component = 'section', className = '', children, ...props },
  ref,
) {
  return <Component ref={ref} className={classes('bui-launch-hero', className)} {...props}>{children}</Component>;
});

export const UILaunchStage = forwardRef(function UILaunchStage(
  { as: Component = 'section', className = '', children, ...props },
  ref,
) {
  return <Component ref={ref} className={classes('bui-launch-stage', className)} {...props}>{children}</Component>;
});

export const UILaunchToolbar = forwardRef(function UILaunchToolbar(
  { as: Component = 'section', className = '', children, ...props },
  ref,
) {
  return <Component ref={ref} className={classes('bui-launch-toolbar', className)} {...props}>{children}</Component>;
});

export const UILaunchNavigation = forwardRef(function UILaunchNavigation(
  { as: Component = 'nav', className = '', children, ...props },
  ref,
) {
  return <Component ref={ref} className={classes('bui-launch-navigation', className)} {...props}>{children}</Component>;
});

export const UILaunchGrid = forwardRef(function UILaunchGrid(
  { as: Component = 'section', className = '', children, ...props },
  ref,
) {
  return <Component ref={ref} className={classes('bui-launch-grid', className)} {...props}>{children}</Component>;
});

export const UILaunchPinned = forwardRef(function UILaunchPinned(
  { as: Component = 'aside', className = '', children, ...props },
  ref,
) {
  return <Component ref={ref} className={classes('bui-launch-pinned', className)} {...props}>{children}</Component>;
});
