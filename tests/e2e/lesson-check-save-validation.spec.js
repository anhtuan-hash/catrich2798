import {test,expect} from '@playwright/test';
const KEY='bes-offline-demo-user-v943';
const user={id:'save-ui-admin',authId:'save-ui-admin',role:'admin',approved:true,
 name:'Assessment Save QA',email:'save-qa@brianenglish.local',school:'BRIAN',
 permissions:{mode:'all',allowed:[]},provider:'offline-demo',demo:true};

test('invalid save explains missing focus directly next to the button',async({page})=>{
 await page.addInitScript(({key,user})=>localStorage.setItem(key,JSON.stringify(user)),{key:KEY,user});
 await page.goto('/#/tool/lesson-check-studio');
 const create=page.locator('.lcs-arcade-create');
 await expect(create).toBeVisible({timeout:20000});
 await create.click();
 const builder=page.locator('.lcs-builder-shell');
 await expect(builder).toBeVisible();
 await builder.getByLabel('Tên hoạt động').fill('Kiểm thử lưu hoạt động');
 await builder.getByLabel('Mã nhúng / URL / HTML').fill('https://arcade.padlet.com/game/test');
 const focus=builder.getByLabel('Chuyên đề / kỹ năng');
 await expect(focus).toHaveValue('unclassified');
 await builder.locator('.lcs-form-actions .lcs-btn-primary').click();
 const alert=builder.locator('.lcs-save-feedback[role="alert"]');
 await expect(alert).toBeVisible();
 await expect(alert).toContainText('Chưa chọn Chuyên đề / kỹ năng');
 await expect(focus).toBeFocused();
 await expect(focus).toHaveAttribute('aria-invalid','true');
 await expect(builder.locator('.lcs-form-actions .lcs-btn-primary')).toBeEnabled();
 // Choosing a valid focus hides the validation error without requiring a reload.
 await focus.selectOption('grammar');
 await expect(alert).toHaveCount(0);
});
